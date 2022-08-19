import { Handler } from '@tinyhttp/app';

export const get: Handler = (req, res) => {
	res.send({ hello: 'world' });
};

export const auth = {
	get: ['users:list']
};
