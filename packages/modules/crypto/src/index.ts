//@ts-ignore
import crypto from 'hypercore-crypto';

export interface KeyPair {
	publicKey: Buffer;
	secretKey: Buffer;
}

export const createKeyPair = (seed?: Buffer): KeyPair => {
	let kp: KeyPair;

	if (seed) {
		if (seed.length !== 32) {
			throw new Error('Invalid seed length');
		} else {
			kp = crypto.keyPair(seed);
		}
	} else {
		kp = crypto.keyPair();
	}

	return kp;
};
