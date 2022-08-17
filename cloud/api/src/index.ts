import { App } from '@tinyhttp/app';
import { cors } from '@tinyhttp/cors';
import { onError } from './errors/index.js';

import { createRouter } from './router.js';

const app = new App({
	onError
});

const port = process.env?.PORT || '8080';

app.use(cors());

createRouter(app);

app.listen(parseInt(port), () => {
	console.log(`Server listening at port: ${port}`);
});
