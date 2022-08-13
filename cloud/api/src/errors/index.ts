import { errors } from './errors';

export type ErrorCode = typeof errors[number]['code'];

export class APIError {
	code: string;
	status: number;
	message: string;
	data: any;

	constructor(message: string, status: number, code: ErrorCode, data: any = {}) {
		this.message = message;
		this.status = status;
		this.code = code;
		this.data = data;
	}
}

export const createError = (code: ErrorCode, data?: any) => {
	let item = errors.find((i) => i.code === code);

	if (item) {
		return new APIError(item.message, item.status, item.code, data);
	}

	return null;
};
