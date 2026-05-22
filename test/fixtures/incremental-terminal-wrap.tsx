import process from 'node:process';
import React, {useEffect, useState} from 'react';
import {Box, Text, render} from '../../src/index.js';

process.stdout.columns = 1000;

const longLine = Array.from(
	{length: 24},
	(_, index) => `STALE-${String(index).padStart(2, '0')}`,
).join('-');

function IncrementalTerminalWrap() {
	const [short, setShort] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setShort(true);
		}, 100);

		return () => {
			clearTimeout(timer);
		};
	}, []);

	return (
		<Box flexDirection="column">
			<Text>{short ? 'short' : longLine}</Text>
			<Text>bottom</Text>
			<Text>done</Text>
		</Box>
	);
}

render(<IncrementalTerminalWrap />, {
	incrementalRendering: true,
});
