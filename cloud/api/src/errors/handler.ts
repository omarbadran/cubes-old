import { ErrorRequestHandler } from 'express';

import { createError, APIError } from './index';

export const handleError: ErrorRequestHandler = (err, req, res, next) => {
	let error = err;

	if (!(err instanceof APIError)) {
		error = createError('internal_server_error');
	}

	res.status((error as APIError).status).send(error);
};
