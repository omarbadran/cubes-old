import { App, Handler } from '@tinyhttp/app';
import scan from 'scan-dir-recursive/sync/relative.js';
import fs, { PathLike } from 'fs';

let methods = ['all', 'get', 'post', 'put', 'delete'] as const;
type method = typeof methods[number];

export const createRouter = async (app: App) => {
	let dir: PathLike = './src/routes/';
	let exist = fs.existsSync(dir);

	if (exist) {
		let files = scan(dir);

		for (let file of files) {
			let js = file.replace('ts', 'js');
			let path = js.replaceAll('index.js', '').replace('.js', '');
			let mod: { [key in method]: Handler } = await import('./routes/' + js);

			for (let method of methods) {
				if (method in mod) {
					app[method](path, mod[method]);
				}
			}
		}
	}
};
