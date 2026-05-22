import terminalSize from 'terminal-size';

type WriteStreamWithHandle = NodeJS.WriteStream & {
	_handle?: {
		getWindowSize?: (size: number[]) => number;
	};
};

/**
Get the effective terminal dimensions from the given stdout stream.

Falls back to `terminal-size` for columns in piped processes where `stdout.columns` is 0, and uses standard defaults (80×24) when dimensions cannot be determined.
*/
export const getWindowSize = (
	stdout: NodeJS.WriteStream,
): {columns: number; rows: number} => {
	const size: number[] = [];
	const result = (stdout as WriteStreamWithHandle)._handle?.getWindowSize?.(
		size,
	);

	// `stdout.columns`/`rows` can be 0 or undefined in non-TTY environments.
	const {columns, rows} = stdout;
	const handleColumns = result === 0 && size[0]! > 0 ? size[0] : undefined;
	const handleRows = result === 0 && size[1]! > 0 ? size[1] : undefined;

	if (columns && rows) {
		return {columns: handleColumns ?? columns, rows};
	}

	const fallbackSize = terminalSize();
	const fallbackColumns = fallbackSize.columns > 0 ? fallbackSize.columns : 80;
	const fallbackRows = fallbackSize.rows > 0 ? fallbackSize.rows : 24;

	return {
		columns:
			handleColumns ?? (columns && columns > 0 ? columns : fallbackColumns),
		rows: rows && rows > 0 ? rows : (handleRows ?? fallbackRows),
	};
};
