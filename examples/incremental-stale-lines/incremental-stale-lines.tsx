import process from 'node:process';
import React, {useEffect, useState} from 'react';
import {Box, Text, render} from '../../src/index.js';

const actualColumns = process.stdout.columns ?? 80;

// Make Ink lay out this app as a single very wide line. The real terminal is
// still narrower, so wrapping happens in the terminal after log-update has
// counted the frame as one logical line.
process.stdout.columns = 1000;

const longLine = Array.from(
	{length: 24},
	(_, index) => `STALE-${String(index).padStart(2, '0')}`,
).join('-');

const frames = [longLine, 'short'] as const;

function IncrementalStaleLines() {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setFrame(currentFrame => (currentFrame + 1) % frames.length);
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, []);

	return (
		<Box flexDirection="column">
			<Text>{frames[frame]}</Text>
			<Text>bottom</Text>
			<Text dimColor>
				actual terminal columns: {actualColumns}; Ink layout columns:{' '}
				{process.stdout.columns}
			</Text>
			<Text dimColor>Ctrl+C</Text>
		</Box>
	);
}

render(<IncrementalStaleLines />, {
	incrementalRendering: true,
});
