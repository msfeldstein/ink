import React, {useRef, useState, useCallback, useEffect} from 'react';
import {render, Box, Text, type DOMElement} from '../../src/index.js';
import {addLayoutListener} from '../../src/dom.js';

// Reproduces the CLI freeze fixed by deferring commit-time layout listeners.
//
// This hook subscribes to root layout commits (the same mechanism useBoxMetrics
// uses) and reports the tracked box's measured height.
const findRoot = (node: DOMElement | null): DOMElement | undefined => {
	if (!node) return undefined;
	if (!node.parentNode) {
		return node.nodeName === 'ink-root' ? node : undefined;
	}

	return findRoot(node.parentNode);
};

function useMeasuredHeight(ref: React.RefObject<DOMElement | null>): number {
	const [height, setHeight] = useState(0);

	const measure = useCallback(() => {
		const next = ref.current?.yogaNode?.getComputedLayout().height ?? 0;
		setHeight(previous => (previous === next ? previous : next));
	}, [ref]);

	useEffect(measure, [measure]);

	useEffect(() => {
		const root = findRoot(ref.current);
		if (!root) return;
		return addLayoutListener(root, measure);
	});

	return height;
}

// The rendered height feeds back into the layout (each pass renders one more
// line than was measured), so every commit re-measures and schedules another
// update.
//
// Without the fix, the layout listener runs synchronously inside React's commit
// (`resetAfterCommit`), so this recurses *during* the commit until React throws
// "Maximum update depth exceeded" and the process dies — you never see output.
//
// With the fix, the listener runs in a microtask after the commit unwinds, so
// the box grows to the cap, settles, and the app keeps running.
function GrowingBox() {
	const ref = useRef<DOMElement>(null);
	const height = useMeasuredHeight(ref);
	const lineCount = Math.min(height + 1, 60);

	return (
		<Box ref={ref} flexDirection="column">
			{Array.from({length: lineCount}, (_, index) => (
				<Text key={index}>line {index + 1}</Text>
			))}
		</Box>
	);
}

render(<GrowingBox />);
