import Hyperbee from 'hyperbee';
import { leveldb } from 'cbor';
import { ulid } from 'ulid';
import * as charwise from 'charwise';
import { flatten, getFields } from './utils';

type Document = {
	[index: string]: any;
};

type Indexes = {
	[index: string]: Hyperbee;
};

export type Query = {
	selector: Array<{
		field: string;
		operation:
			| '$eq'
			| '$gt'
			| '$lt'
			| '$gte'
			| '$lte'
			| '$between'
			| '$betweenInclusive'
			| '$containAll'
			| '$containAny';
		value: any; //to-do: don't use any here, each operation accepts a certain type
	}>;
	limit?: number;
	skip?: number;
};

/**
 * Database
 */
export default class Database {
	documents: Hyperbee;
	indexes: Indexes;
	sep: string = '/';

	/**
	 * Create a database.
	 *
	 * @param core - a hypercore instance to store the documents
	 */
	constructor(core: any) {
		this.documents = new Hyperbee(core, {
			keyEncoding: 'utf-8',
			valueEncoding: leveldb
		});

		this.indexes = {};
	}

	/**
	 * Make sure the the feed is ready.
	 *
	 * @returns a boolean promise.
	 * @public
	 */
	async ready(): Promise<boolean> {
		await this.documents.ready();

		return true;
	}

	/**
	 * Do we have any indexes loaded?
	 *
	 * @returns boolean.
	 * @public
	 */
	hasIndexes(): boolean {
		return Object.keys(this.indexes).length > 0;
	}

	/**
	 * Create a new document.
	 *
	 * @param document - optional values with which to initialize the entity.
	 * @returns The id of new document.
	 * @public
	 */
	async create(document: Document): Promise<string> {
		let id: string;

		if (document?.id) {
			id = document.id;
			delete document.id;
		} else {
			id = ulid();
		}

		let exists = await this.documents.get(id);

		if (exists) {
			throw new Error('Document already exists with the same ID');
		}

		if (this.hasIndexes()) {
			await this.indexDocument(id, document);
		}

		try {
			await this.documents.put(id, document);
		} catch (error) {
			throw error;
		}

		return id;
	}

	/**
	 * Get a document by ID.
	 *
	 * @param id - the id of the document you seek.
	 * @returns The matching document or null.
	 * @public
	 */
	async one(id: string): Promise<Document | null> {
		let record = await this.documents.get(id);

		if (!record) {
			return null;
		}

		return record.value;
	}

	/**
	 * Get all documents.
	 *
	 * @returns iterable stream of documents.
	 * @public
	 */
	async *all(opts = {}): AsyncGenerator<Document> {
		for await (const item of this.documents.createReadStream(opts)) {
			yield { id: item.key, ...item.value };
		}
	}

	/**
	 * Update a document.
	 *
	 * @param id - the id of the document you want to update.
	 * @param changes - a function that returns the new document
	 * @returns True on success.
	 * @public
	 */
	async update(id: string, changes: (document: Document) => Document): Promise<boolean> {
		let exists = await this.documents.get(id);

		if (!exists) {
			throw new Error('No documents exists with this ID');
		}

		if (this.hasIndexes()) {
			await this.deIndexDocument(id, exists.value);
		}

		let updated = changes(exists.value);

		if (updated?.id) {
			throw new Error("Fields with the key 'id' are not allowed");
		}

		if (this.hasIndexes()) {
			await this.indexDocument(id, updated);
		}

		try {
			await this.documents.put(id, updated);
		} catch (error) {
			throw error;
		}

		return true;
	}

	/**
	 * Delete a document by ID.
	 *
	 * @param id - the id of the document you want to delete.
	 * @returns True on success.
	 * @public
	 */
	async delete(id: string): Promise<boolean> {
		let exists = await this.documents.get(id);

		if (!exists) {
			throw new Error('No documents exists with this ID');
		}

		if (this.hasIndexes()) {
			await this.deIndexDocument(id, exists.value);
		}

		try {
			await this.documents.del(id);
		} catch (error) {
			throw error;
		}

		return true;
	}

	/**
	 * Load an index to this database.
	 *
	 * @param field - the name of the field for this index.
	 * @param core - either a hypercore instance or a string to be used a sub bee.
	 * @returns True on success.
	 * @public
	 */
	async initializeIndex(field: string, core?: any): Promise<boolean> {
		if (field === 'id') {
			throw new Error('id is automaticly indexed');
		}

		if (core) {
			this.indexes[field] = new Hyperbee(core, {
				keyEncoding: 'utf-8',
				valueEncoding: 'utf-8'
			});
		} else {
			this.indexes[field] = this.documents.sub('index.' + field);
		}

		await this.indexes[field].ready();

		return true;
	}

	/**
	 * Build an index from existing documents
	 *
	 * @param field - the name of the field you want to index, leave empty to build all initialized indexes.
	 * @returns True on success.
	 * @public
	 */
	async buildIndex(field?: string): Promise<boolean> {
		for await (const doc of this.documents.createReadStream()) {
			let ignore: Array<string> = [];

			if (field) {
				ignore = Object.keys(this.indexes).filter((a) => a !== field);
			}

			await this.indexDocument(doc.key, doc.value, ignore);
		}

		return true;
	}

	/**
	 * Index a document
	 *
	 * @param id - id of the document.
	 * @param document - the document to index.
	 * @param ignore - a list of fields to execlude from indexing.
	 * @returns True on success.
	 * @private
	 */
	private async indexDocument(
		id: string,
		document: Document,
		ignore: Array<string> = []
	): Promise<boolean> {
		let fields = getFields(document);
		let indexes = Object.keys(this.indexes).filter((a) => !ignore.includes(a));
		let indexable = fields.filter((i) => indexes.includes(i));
		let flattened = flatten(document);

		for (const field of indexable) {
			let value = flattened[field];

			let { single, multi } = this.createIndexKeys(id, value);

			// single key
			await this.indexes[field].put(single, id);

			// multi key
			for (let key of multi) {
				await this.indexes[field].sub('multi').put(key, id);
			}
		}

		return true;
	}

	/**
	 * De-index a document
	 *
	 * @param id - id of the document.
	 * @param document - the document to deindex.
	 * @param ignore - a list of fields to execlude from deindexing.
	 * @returns True on success.
	 * @private
	 */
	private async deIndexDocument(
		id: string,
		document: Document,
		ignore: Array<string> = []
	): Promise<boolean> {
		let fields = getFields(document);
		let indexes = Object.keys(this.indexes).filter((a) => !ignore.includes(a));
		let indexable = fields.filter((i) => indexes.includes(i));
		let flattened = flatten(document);

		for (const field of indexable) {
			let value = flattened[field];

			let { single, multi } = this.createIndexKeys(id, value);

			// single key
			await this.indexes[field].del(single, id);

			// multi key
			for (let key of multi) {
				await this.indexes[field].sub('multi').del(key, id);
			}
		}

		return true;
	}

	/**
	 * Create sortable keys for indexing
	 *
	 * @param id - id of the document.
	 * @param value - the field value to be indexed.
	 * @returns single and/or multi keys depending on value type.
	 * @private
	 */
	private createIndexKeys(id: string, value: any): { single: string; multi: Array<string> } {
		let multi: Array<string> = [];
		let append = this.sep + id;

		// single key index (for primitive operations)
		let single = charwise.encode(value) + append;

		// multi key index (for arrays)
		if (Array.isArray(value)) {
			for (const str of value) {
				let key = charwise.encode(str) + append;

				if (!value.includes(key)) {
					multi.push(key);
				}
			}
		}

		return { single, multi };
	}

	/**
	 * Find an item
	 *
	 * @param query - query options.
	 * @returns iterable stream of matching documents.
	 * @public
	 */
	async *find(query: Query): AsyncGenerator<Document> {
		let found: Array<string> = [];
		let skipped: number = 0;

		for (let criteria of query.selector) {
			let { field, operation, value } = criteria;

			if (!(field in this.indexes)) {
				throw new Error(
					`Cannot query on field [${field}] since it is not indexed, either index this field or use all() and filter the results manually`
				);
			}

			let multi = ['$containAll', '$containAny'].includes(criteria.operation);

			let keys: AsyncGenerator<string>;

			if (!multi) {
				keys = this.scanSingleIndex(field, operation, value);
			} else {
				keys = this.scanMultiIndex(field, operation, value);
			}

			// yield the document
			for await (const key of keys) {
				if (query?.skip && query.skip < skipped) {
					skipped++;
					continue;
				}

				if (query?.limit && query.limit == found.length) {
					break;
				}

				let doc = await this.documents.get(key);

				if (doc) {
					found.push(key);

					yield { id: key, ...doc.value };
				} else {
					continue; // Should we throw an error here?
				}
			}
		}
	}

	/**
	 * Scan single field indexes
	 *
	 * @param field - an indexed field.
	 * @param operation - the type of this operation.
	 * @param value - the value to be queried.
	 * @returns iterable stream of matching keys.
	 * @private
	 */
	private async *scanSingleIndex(
		field: string,
		operation: string,
		value: any
	): AsyncGenerator<string> {
		let bee = this.indexes[field];

		let encoded = charwise.encode(value);

		let opts: {
			gt?: string;
			lt?: string;
			gte?: string;
			lte?: string;
		} = {};

		switch (operation) {
			case '$eq':
				opts = {
					gte: encoded,
					lte: encoded
				};
				break;

			case '$gt':
				opts = {
					gt: encoded
				};
				break;

			case '$lt':
				opts = {
					lt: encoded
				};
				break;

			case '$lte':
				opts = {
					lte: encoded
				};
				break;

			case '$gte':
				opts = {
					gte: encoded
				};
				break;

			case '$between':
				opts = {
					gt: charwise.encode(value[0]),
					lt: charwise.encode(value[1])
				};
				break;

			case '$betweenInclusive':
				opts = {
					gte: charwise.encode(value[0]),
					lte: charwise.encode(value[1])
				};
				break;
		}

		opts = this.indexScanOptions(opts);

		let keys = bee.createReadStream(opts);

		for await (const item of keys) {
			yield item.value;
		}
	}

	/**
	 * Scan multi-key indexes
	 *
	 * @param field - index field.
	 * @param operation - the type of this operation.
	 * @param value - the value to be queried.
	 * @returns iterable stream of matching keys.
	 * @private
	 */
	private async *scanMultiIndex(
		field: string,
		operation: string,
		value: Array<any>
	): AsyncGenerator<string> {
		let matched: {
			[key: string]: Array<string>;
		} = {};

		let bee = this.indexes[field].sub('multi');

		if (!Array.isArray(value)) {
			throw new Error('This operation can only be used with array values');
		}

		for (let item of value) {
			item = charwise.encode(item);
			matched[item] = [];

			let opts = this.indexScanOptions({
				gte: item,
				lte: item
			});

			let keys = bee.createReadStream(opts);

			for await (let key of keys) {
				key = key.value;

				if (operation === '$containAny') {
					yield key;
				}

				if (operation === '$containAll') {
					matched[item].push(key);

					let found = Object.values(matched);

					let hasAll = found.filter((a) => a.includes(key));

					if (hasAll.length === value.length) {
						// this document had all the other items too
						yield key;
					}
				}
			}
		}
	}

	/**
	 * Prepare index scan options
	 *
	 * @param opts - query options.
	 * @returns modified opts object that can be used to scan indexes accurately
	 * @private
	 */
	private indexScanOptions(opts: { [key: string]: string }): object {
		if (opts.lte) {
			opts.lte = opts.lte + this.sep + '\xff';
		}

		if (opts.gte) {
			opts.gte = opts.gte + this.sep + '\x00';
		}

		if (opts.lt) {
			opts.lt = opts.lt + this.sep + '\x00';
		}

		if (opts.gt) {
			opts.gt = opts.gt + this.sep + '\xff';
		}

		return opts;
	}
}
