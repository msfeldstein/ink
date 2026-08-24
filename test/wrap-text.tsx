import test from 'ava';
import wrapText, {wrapTextCache} from '../src/wrap-text.js';

test('wraps text', t => {
	t.is(wrapText('hello world', 5, 'wrap'), 'hello\n \nworld');
});

test('truncates text at the end', t => {
	t.is(wrapText('hello world', 5, 'truncate-end'), 'hell…');
});

test('uses separate cache entries for different widths', t => {
	t.is(wrapText('hello world', 5, 'truncate-end'), 'hell…');
	t.is(wrapText('hello world', 8, 'truncate-end'), 'hello w…');
});

test('evicts old cached results', t => {
	const cacheKey = 'cache-test-first5truncate-end';
	wrapTextCache.clear();
	wrapText('cache-test-first', 5, 'truncate-end');

	for (let index = 0; index < 8192; index++) {
		wrapText(`cache-test-${index}`, 5, 'truncate-end');
	}

	t.false(wrapTextCache.has(cacheKey));
});
