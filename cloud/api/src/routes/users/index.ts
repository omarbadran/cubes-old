import { Handler } from '@tinyhttp/app';

export const get: Handler = (req, res) => {
	res.send({ a: 1 });
};
