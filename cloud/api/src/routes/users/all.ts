import { Handler } from '@tinyhttp/app';
import { createError } from '../../errors/index.js';

export const get: Handler = (req, res) => {
	throw createError('unauthorized', { a: 'b' });
};
