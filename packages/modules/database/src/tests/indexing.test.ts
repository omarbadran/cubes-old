import { createDB, createCore } from './misc/helpers';

test('Load an index', async () => {
	const db = createDB();

	await db.ready();

	await db.initializeIndex('age');

	expect(db.indexes).toHaveProperty('age');

	expect(db.indexes?.age).toHaveProperty('ready');
});

test('Indexing and de-indexing documents', async () => {
	const db = createDB();

	await db.ready();

	// initialize indexes
	await db.initializeIndex('tags', createCore());
	await db.initializeIndex('nested.age', createCore());

	// get index state
	const indexState = async (): Promise<{ age: number; tags: number }> => {
		let ageIndex: { [key: string]: string } = {};
		let tagsIndex: { [key: string]: string } = {};

		// age index
		for await (const item of db.indexes['nested.age'].createReadStream()) {
			ageIndex[item.key] = item.value;
		}

		// tags index
		for await (const item of db.indexes['tags'].createReadStream()) {
			tagsIndex[item.key] = item.value;
		}

		let lth = (obj: object): number => Object.keys(obj).length;

		return { age: lth(ageIndex), tags: lth(tagsIndex) };
	};

	// CREATING DOCUMENTS
	let firstUser = await db.create({
		name: 'carl',
		tags: ['one', 'two', 'three'],
		nested: {
			age: 21
		}
	});

	let secondUser = await db.create({
		name: 'carl',
		tags: ['four', 'five'],
		nested: {
			age: 19
		}
	});

	let state = await indexState();

	expect(state?.age).toBe(2);
	expect(state?.tags).toBe(7);

	// UPDATING DOCUMENTS
	await db.update(secondUser, (doc) => {
		doc.tags = ['four'];
		doc.nested.age = 20;

		return doc;
	});

	state = await indexState();

	expect(state?.age).toBe(2);
	expect(state?.tags).toBe(6);

	// DELETING DOCUMENTS
	await db.delete(secondUser);

	state = await indexState();

	expect(state?.age).toBe(1);
	expect(state?.tags).toBe(4);
});
