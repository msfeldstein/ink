import process from 'node:process';
import React, {
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import {render, Text, useApp, useInput} from '../../src/index.js';

type ChildProperties = {
	readonly value: string;
	readonly onChange: (value: string) => void;
};

const MemoChild = memo(({value, onChange}: ChildProperties) => {
	const {exit} = useApp();
	const latestValueRef = useRef(value);
	const staleClosureSeenRef = useRef(false);

	useLayoutEffect(() => {
		latestValueRef.current = value;
	});

	useInput((input, key) => {
		if (value !== latestValueRef.current) {
			staleClosureSeenRef.current = true;
		}

		if (key.return) {
			process.stdout.write(
				`\nFINAL value:${JSON.stringify(latestValueRef.current)} stale:${String(
					staleClosureSeenRef.current,
				)}\n`,
			);
			exit();
			return;
		}

		onChange(value + input);
	});

	return <Text>{value}</Text>;
});

function App() {
	const [value, setValue] = useState('');
	const onChange = useCallback((nextValue: string) => {
		setValue(nextValue);
	}, []);

	useEffect(() => {
		process.stdout.write('__READY__');
	}, []);

	return <MemoChild value={value} onChange={onChange} />;
}

render(<App />);
