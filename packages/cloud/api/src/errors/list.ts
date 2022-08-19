export default [
	{
		code: 'invalid_json',
		status: 400,
		message: 'The request body could not be decoded as JSON.'
	},
	{
		code: 'invalid_request_url',
		status: 400,
		message: 'The request URL is not valid.'
	},
	{
		code: 'invalid_request',
		status: 400,
		message: 'This request is not supported.'
	},
	{
		code: 'validation_error',
		status: 400,
		message: 'The request body does not match the schema for the expected parameters.'
	},
	{
		code: 'unauthorized',
		status: 401,
		message: 'You are not authorized to access this resource.'
	},
	{
		code: 'restricted_resource',
		status: 403,
		message: "You don't have permission to perform this operation."
	},
	{
		code: 'resource_not_found',
		status: 404,
		message: 'Resource could not not be found.'
	},
	{
		code: 'conflict_error',
		status: 409,
		message: 'The operation could not be completed.'
	},
	{
		code: 'rate_limited',
		status: 429,
		message: 'This request exceeds the number of requests allowed.'
	},
	{
		code: 'internal_server_error',
		status: 500,
		message: 'An unexpected error occurred.'
	},
	{
		code: 'service_unavailable',
		status: 503,
		message: 'Service is unavailable. Try again later.'
	},
	{
		code: 'database_connection_unavailable',
		status: 503,
		message: 'Database is unavailable or in an unqueryable state. Try again later.'
	}
] as const;
