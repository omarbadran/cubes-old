import { Handler } from '@tinyhttp/app';
import { createError } from '../errors/index.js';
import { verify } from '../token.js';

export const authorize = (rules: string[] = []): Handler => {
	return async (req, res) => {
		const token = req?.cookies?.token;

		if (!token) {
			throw createError('unauthorized', {
				reason: 'token_missing'
			});
		}

		const { payload } = await verify(token);

		let claims: string[] = [];

		if (payload?.claims && Array.isArray(payload?.claims)) {
			claims = payload.claims;
		}

		let missing = rules.some((i) => !claims.includes(i));

		if (missing) {
			throw createError('unauthorized', {
				reason: 'missing_claims'
			});
		}
	};
};
