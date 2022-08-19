import Database from '../../index';
// @ts-ignore
import ram from 'random-access-memory';
// @ts-ignore
import Hypercore from 'hypercore';

// Create a hypercore in memory
export const createCore = (): Database => {
	return new Hypercore(ram);
};

// Create a database in memory
export const createDB = (): Database => {
	return new Database(createCore());
};
