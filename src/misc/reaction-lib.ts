import { emojiRegex } from './emoji-regex';
import { fetchMeta } from './fetch-meta';
import { Emojis } from '../models';
import { toPunyNullable } from './convert-host';

const basic10: Record<string, string> = {
	'ð': 'like',
	'â¤': 'love',	// ããã«è¨è¿°ããå ´åã¯ç°ä½å­ã»ã¬ã¯ã¿ãå¥ããªã
	'ð': 'laugh',
	'ð¤': 'hmm',
	'ð®': 'surprise',
	'ð': 'congrats',
	'ð¢': 'angry',
	'ð¥': 'confused',
	'ð': 'rip',
	'ð®': 'pudding',
};

export async function getFallbackReaction(): Promise<string> {
	const meta = await fetchMeta();
	return  meta.useStarForReactionFallback ? 'star' : 'like';
}

export function convertLegacyReactions(reactions: Record<string, number>) {
	// v12, m544 ã§ã¯ ããã«æå­å => Unicode å¦çããããå¯¾å¿ããªã

	const _reactions2 = {} as Record<string, number>;

	for (const reaction of Object.keys(reactions)) {
		_reactions2[decodeReaction(reaction).reaction] = reactions[reaction];
	}

	return _reactions2;
}

export async function toDbReaction(reaction?: string | null, reacterHost?: string | null): Promise<string> {
	if (reaction == null) return await getFallbackReaction();

	reacterHost = toPunyNullable(reacterHost);

	// æ¢å­ã®æå­åãªã¢ã¯ã·ã§ã³ã¯ãã®ã¾ã¾
	if (Object.values(basic10).includes(reaction)) return reaction;

	// Unicodeçµµæå­
	const match = emojiRegex.exec(reaction);
	if (match) {
		// åå­ãå«ã1ã¤ã®çµµæå­
		const unicode = match[0];

		// ç°ä½å­ã»ã¬ã¯ã¿é¤å»å¾ã®çµµæå­
		const normalized = unicode.match('\u200d') ? unicode : unicode.replace(/\ufe0f/g, '');

		// Unicodeããªã³ã¯å¯¿å¸åä¸è½ã¨ããããæå­ååããªã
		if (normalized === 'ð®') return normalized;

		// ããªã³ä»¥å¤ã®æ¢å­ã®ãªã¢ã¯ã·ã§ã³ã¯æå­ååãã
		if (basic10[normalized]) return basic10[normalized];

		// ããä»¥å¤ã¯Unicodeã®ã¾ã¾
		return normalized;
	}

	const custom = reaction.match(/^:([\w+-]+)(?:@\.)?:$/);
	if (custom) {
		const name = custom[1];
		const emoji = await Emojis.findOne({
			host: reacterHost || null,
			name,
		});

		if (emoji) return reacterHost ? `:${name}@${reacterHost}:` : `:${name}:`;
	}

	return await getFallbackReaction();
}

type DecodedReaction = {
	/**
	 * ãªã¢ã¯ã·ã§ã³å (Unicode Emoji or ':name@hostname' or ':name@.')
	 */
	reaction: string;

	/**
	 * name (ã«ã¹ã¿ã çµµæå­ã®å ´åname, Emojiã¯ã¨ãªã«ä½¿ã)
	 */
	name?: string;

	/**
	 * host (ã«ã¹ã¿ã çµµæå­ã®å ´åhost, Emojiã¯ã¨ãªã«ä½¿ã)
	 */
	host?: string | null;
};

export function decodeReaction(str: string): DecodedReaction {
	const custom = str.match(/^:([\w+-]+)(?:@([\w.-]+))?:$/);

	if (custom) {
		const name = custom[1];
		const host = custom[2] || null;

		return {
			reaction: `:${name}@${host || '.'}:`,	// ã­ã¼ã«ã«åã¯@ä»¥éãçç¥ããã®ã§ã¯ãªã.ã«ãã
			name,
			host
		};
	}

	return {
		reaction: str,
		name: undefined,
		host: undefined
	};
}

export function convertLegacyReaction(reaction: string): string {
	reaction = decodeReaction(reaction).reaction;
	//if (Object.keys(legacies).includes(reaction)) return legacies[reaction];
	return reaction;
}
