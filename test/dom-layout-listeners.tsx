import React, {useRef, useState, useCallback, useEffect} from 'react';
import test from 'ava';
import delay from 'delay';
import stripAnsi from 'strip-ansi';
import {Box, Text, render} from '../src/index.js';
import {
	addLayoutListener,
	createNode,
	emitLayoutListeners,
	type DOMElement,
} from '../src/dom.js';
import createStdout from './helpers/create-stdout.js';

test('emitLayoutListeners runs listeners synchronously', t => {
	// The resize handler emits outside React's commit stack, so it must stay
	// synchronous. Only the reconciler's commit-time emit is deferred.
	const rootNode = createNode('ink-root');
	const events: string[] = [];

	addLayoutListener(rootNode, () => {
		events.push('listener');
	});

	emitLayoutListeners(rootNode);
	events.push('after emit');

	t.deepEqual(events, ['listener', 'after emit']);
});

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

test('commit-time layout feedback loop converges without crashing', async t => {
	// The rendered height feeds back into the layout, so every commit re-measures
	// and schedules another update. When the reconciler emitted layout listeners
	// synchronously during commit, this recursed until React threw "Maximum
	// update depth exceeded" and the process died. Deferring the commit-time emit
	// lets each step be a normal update, so the box converges to the cap.
	function GrowingBox() {
		const ref = useRef<DOMElement>(null);
		const height = useMeasuredHeight(ref);
		const lineCount = Math.min(height + 1, 60);

		return (
			<Box ref={ref} flexDirection="column">
				{Array.from({length: lineCount}, (_, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<Text key={index}>line {index + 1}</Text>
				))}
			</Box>
		);
	}

	const stdout = createStdout(100);

	await t.notThrowsAsync(async () => {
		const app = render(<GrowingBox />, {stdout, debug: true});
		// Without the fix the process dies before this resolves; with it, the
		// deferred loop climbs steadily without tripping React's update guard.
		await delay(500);

		t.true(
			stripAnsi(stdout.get()).includes('line 20'),
			'deferred feedback loop should keep climbing without crashing',
		);

		app.unmount();
		await app.waitUntilExit();
	});
});
