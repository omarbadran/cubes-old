import { jwtVerify, SignJWT } from 'jose';
import { createKeyPair } from '@cubes/crypto';
import { base58btc } from 'multiformats/bases/base58';

const secret = process.env?.JWT_SECRET || '';

const { publicKey, secretKey } = createKeyPair(Buffer.alloc(32, secret));

const issuer = 'did:key:' + base58btc.encode(publicKey);

// sign
export const sign = async (claims: string[]) => {
	const jwt = await new SignJWT({ claims })
		.setProtectedHeader({ alg: 'ES256' })
		.setIssuedAt()
		.setIssuer(issuer)
		.setExpirationTime('2h')
		.sign(secretKey);

	return jwt;
};

// verify
export const verify = async (token: string) => {
	const jwt = await jwtVerify(token, publicKey, {
		issuer
	});

	return jwt;
};
