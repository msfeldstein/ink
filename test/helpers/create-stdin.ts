import EventEmitter from 'node:events';
import {stub} from 'sinon';

export const createStdin = (): NodeJS.ReadStream => {
	const stdin = new EventEmitter() as unknown as NodeJS.ReadStream;
	stdin.isTTY = true;
	stdin.isRaw = false;
	stdin.setRawMode = stub();
	stdin.setEncoding = () => {};
	stdin.read = stub();
	stdin.unref = () => {};
	stdin.ref = () => {};

	return stdin;
};

export const emitReadable = (stdin: NodeJS.ReadStream, chunk: string): void => {
	/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
	const read = stdin.read as ReturnType<typeof stub>;
	read.onCall(0).returns(chunk);
	read.onCall(1).returns(null);
	stdin.emit('readable');
	read.reset();
	/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
};
