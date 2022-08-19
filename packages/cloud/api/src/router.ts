import { App, Handler } from '@tinyhttp/app';
import scan from 'scan-dir-recursive/sync/relative.js';
import fs, { PathLike } from 'fs';
import { authorize } from './mw/authorize.js';

export const APIMethods = ['all', 'get', 'post', 'put', 'delete'] as const;
export type APIMethod = typeof APIMethods[number];

export const createRouter = async (app: App) => {
	let dir: PathLike = './src/routes/';
	let exist = fs.existsSync(dir);

	if (exist) {
		let files = scan(dir);

		for (let file of files) {
			let js = file.replace('ts', 'js');
			let path = js.replaceAll('index.js', '').replace('.js', '');
			let mod = await import('./routes/' + js);

			for (let method of APIMethods) {
				if (method in mod) {
					let auth = mod?.auth;
					// add auth first
					if (auth && method in auth) {
						app[method](path, authorize(auth[method]), mod[method]);
					} else {
						app[method](path, mod[method]);
					}
				}
			}
		}
	}
};
