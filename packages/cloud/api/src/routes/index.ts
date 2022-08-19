import { Handler } from '@tinyhttp/app';

export const get: Handler = (req, res) => {
	res.send({
		version: process.env.npm_package_version
	});
};
