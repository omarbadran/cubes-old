import type { Handler } from 'express';

export const get: Handler = async (req, res, next) => {
	res.send({
		version: process.env.npm_package_version
	});
};
