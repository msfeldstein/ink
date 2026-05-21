import process from 'node:process';
import React, {useEffect, useState} from 'react';
import {Box, Text, render} from '../../src/index.js';

// Force a narrow terminal so the first frame wraps in a predictable way.
// Before the incremental rendering wrapped-line fix, switching to "short"
// left the old "0123456789" physical row behind.
process.stdout.columns = 10;

const frames = ['0123456789abc', 'short'] as const;

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
			<Text>Ctrl+C</Text>
		</Box>
	);
}

render(<IncrementalStaleLines />, {
	incrementalRendering: true,
});
