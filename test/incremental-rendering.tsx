import process from 'node:process';
import {createRequire} from 'node:module';
import path from 'node:path';
import url from 'node:url';
import test from 'ava';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const {spawn} = require('node-pty') as typeof import('node-pty');

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const renderTerminalRows = (
	writes: string[],
	{columns, rows}: {columns: number; rows: number},
) => {
	const createRow = () => Array.from({length: columns}, () => ' ');
	const screen = Array.from({length: rows}, createRow);
	let x = 0;
	let y = 0;
	let pendingWrap = false;

	const ensureRow = () => {
		while (y >= screen.length) {
			screen.push(createRow());
		}
	};

	const clearWholeLine = () => {
		ensureRow();
		screen[y]!.fill(' ');
	};

	const clearEndLine = () => {
		ensureRow();

		for (let column = x; column < columns; column++) {
			screen[y]![column] = ' ';
		}
	};

	const parseControlSequence = (chunk: string, start: number) => {
		let end = start + 2;

		while (end < chunk.length && !/[A-Za-z]/.test(chunk[end]!)) {
			end++;
		}

		const final = chunk[end];
		const parameters = chunk.slice(start + 2, end);
		const value = Number(parameters.replace('?', '')) || 1;

		if (final === 'A') {
			y = Math.max(0, y - value);
			pendingWrap = false;
		}

		if (final === 'B') {
			y += value;
			ensureRow();
			pendingWrap = false;
		}

		if (final === 'E') {
			y += value;
			x = 0;
			ensureRow();
			pendingWrap = false;
		}

		if (final === 'G') {
			x = Math.min(columns - 1, Math.max(0, value - 1));
			pendingWrap = false;
		}

		if (final === 'J' && value === 2) {
			for (const row of screen) {
				row.fill(' ');
			}

			x = 0;
			y = 0;
			pendingWrap = false;
		}

		if (final === 'K') {
			if (value === 2) {
				clearWholeLine();
			} else {
				clearEndLine();
			}

			pendingWrap = false;
		}

		return end;
	};

	const writeCharacter = (character: string) => {
		if (pendingWrap) {
			y++;
			x = 0;
			pendingWrap = false;
		}

		ensureRow();
		screen[y]![x] = character;

		if (x === columns - 1) {
			pendingWrap = true;
		} else {
			x++;
		}
	};

	for (const chunk of writes) {
		for (let index = 0; index < chunk.length; index++) {
			const character = chunk[index]!;

			if (character === '\u001B' && chunk[index + 1] === '[') {
				index = parseControlSequence(chunk, index);
				continue;
			}

			if (character === '\r') {
				x = 0;
				pendingWrap = false;
				continue;
			}

			if (character === '\n') {
				y++;
				x = 0;
				pendingWrap = false;
				ensureRow();
				continue;
			}

			writeCharacter(character);
		}
	}

	return screen.map(row => row.join('').trimEnd());
};

test.serial(
	'incremental rendering clears rows that wrapped in the PTY',
	async t => {
		const columns = 80;
		const writes: string[] = [];

		await new Promise<void>((resolve, reject) => {
			const term = spawn(
				'node',
				[
					'--import=tsx',
					path.join(__dirname, 'fixtures/incremental-terminal-wrap.tsx'),
				],
				{
					name: 'xterm-color',
					cols: columns,
					rows: 12,
					cwd: __dirname,
					env: {
						...(process.env as Record<string, string>),
						// eslint-disable-next-line @typescript-eslint/naming-convention
						CI: 'false',
						// eslint-disable-next-line @typescript-eslint/naming-convention
						NODE_NO_WARNINGS: '1',
					},
				},
			);

			term.onData(data => {
				writes.push(data);
			});

			term.onExit(({exitCode}) => {
				if (exitCode === 0) {
					resolve();
					return;
				}

				reject(new Error(`Process exited with code ${exitCode}`));
			});

			setTimeout(() => {
				term.kill();
				resolve();
			}, 1000);
		});

		const rows = renderTerminalRows(writes, {columns, rows: 12});

		t.true(rows.includes('short'));
		t.true(rows.includes('bottom'));
		t.false(rows.some(row => row.includes('STALE')));
	},
);
