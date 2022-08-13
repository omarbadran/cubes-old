import express, { Handler } from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import createRouter from 'express-file-routing';
import { json, urlencoded } from 'body-parser';
import { handleError } from './errors/handler';
import asyncHandler from 'async-express-mw';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Router
createRouter(app);

// Middlewares
app.use(morgan('dev'))
	.use(urlencoded({ extended: true }))
	.use(json())
	.use(cors())
	.use(asyncHandler)
	.use(handleError);

// Listen
app.listen(port, () => {
	console.log(`api running on ${port}`);
});
