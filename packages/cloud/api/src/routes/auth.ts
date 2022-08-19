import { Handler } from '@tinyhttp/app';

export const post: Handler = (req, res) => {
	const username = req.params.username;
	const password = req.params.password;

	const claims = ['users:list'];

	res.cookie('token', 'tooookeeen', {
		expires: new Date(Date.now() + 900000),
		httpOnly: true
	});
};
