import ansiEscapes from 'ansi-escapes';
import {hasAnsiControlCharacters, tokenizeAnsi} from './ansi-tokenizer.js';

const urlRegex = /\bhttps?:\/\/[^\s<>"'`]+/gi;
const closingPairs = new Map([
	[')', '('],
	[']', '['],
	['}', '{'],
]);

const countCharacter = (text: string, character: string): number =>
	[...text].filter(current => current === character).length;

const shouldTrimTrailingCharacter = (
	url: string,
	character: string,
): boolean => {
	if ('.!,;:'.includes(character)) {
		return true;
	}

	const openingCharacter = closingPairs.get(character);
	if (!openingCharacter) {
		return false;
	}

	return countCharacter(url, character) > countCharacter(url, openingCharacter);
};

const splitUrlSuffix = (url: string): {url: string; suffix: string} => {
	let linkedUrl = url;
	let suffix = '';

	while (linkedUrl.length > 0) {
		const lastCharacter = linkedUrl.at(-1)!;
		if (!shouldTrimTrailingCharacter(linkedUrl, lastCharacter)) {
			break;
		}

		linkedUrl = linkedUrl.slice(0, -1);
		suffix = lastCharacter + suffix;
	}

	return {url: linkedUrl, suffix};
};

const linkifyText = (text: string): string =>
	text.replaceAll(urlRegex, match => {
		const {url, suffix} = splitUrlSuffix(match);

		if (url.length === 0) {
			return match;
		}

		return ansiEscapes.link(url, url) + suffix;
	});

const getOscPayload = (osc: string): string | undefined => {
	const startIndex = osc.startsWith('\u001B]')
		? 2
		: osc.startsWith('\u009D')
			? 1
			: undefined;
	if (startIndex === undefined) {
		return undefined;
	}

	const endIndex = osc.endsWith('\u001B\\')
		? osc.length - 2
		: osc.endsWith('\u0007') || osc.endsWith('\u009C')
			? osc.length - 1
			: osc.length;

	return osc.slice(startIndex, endIndex);
};

const getOsc8Uri = (osc: string): string | undefined => {
	const payload = getOscPayload(osc);

	if (!payload?.startsWith('8;')) {
		return undefined;
	}

	const uriSeparatorIndex = payload.indexOf(';', 2);

	if (uriSeparatorIndex === -1) {
		return undefined;
	}

	return payload.slice(uriSeparatorIndex + 1);
};

const linkifyUrls = (text: string): string => {
	if (!text.includes('http://') && !text.includes('https://')) {
		return text;
	}

	if (!hasAnsiControlCharacters(text)) {
		return linkifyText(text);
	}

	let output = '';
	let insideExplicitHyperlink = false;

	for (const token of tokenizeAnsi(text)) {
		if (token.type === 'osc') {
			const osc8Uri = getOsc8Uri(token.value);

			if (osc8Uri !== undefined) {
				insideExplicitHyperlink = osc8Uri.length > 0;
			}

			output += token.value;
			continue;
		}

		output +=
			token.type === 'text' && !insideExplicitHyperlink
				? linkifyText(token.value)
				: token.value;
	}

	return output;
};

export default linkifyUrls;
