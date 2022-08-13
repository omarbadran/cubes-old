import type { Handler } from 'express';
import { createError } from '../../errors';

export const get: Handler = async (req, res, next) => {
	try {
		throw createError('unauthorized');
	} catch (err) {
		next(err);
	}
};
