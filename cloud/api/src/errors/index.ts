import { ErrorHandler } from '@tinyhttp/app';

import errors from './list.js';

export type ErrorCode = typeof errors[number]['code'];

export const onError: ErrorHandler = (err, req, res) => {
	res.status(err?.status || 500).send(err);
};

export const createError = (code: ErrorCode, data?: any) => {
	let item = errors.find((i) => i.code === code);

	if (item) {
		return { ...item, data };
	}

	return null;
};
