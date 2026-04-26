import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoundSwipeStat, WordItem } from '../../models';
import { RoomServiceError } from '../room.service';

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any imports that use them
// ---------------------------------------------------------------------------

vi.mock('../../config/redis', () => ({
  redisClient: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    exists: vi.fn().mockResolvedValue(0),
    llen: vi.fn().mockResolvedValue(0),
    lpop: vi.fn().mockResolvedValue(null),
    rpush: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
    sadd: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';
import { redisClient } from '../../config/redis';
import { WordService } from '../word.service';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const WORD_DATA_TTL_SECONDS = 24 * 60 * 60;

function makeWord(id: number): WordItem {
  return { id, word: `word_${id}`, difficulty: 'easy', category: 'test' };
}

function makeWords(count: number): WordItem[] {
  return Array.from({ length: count }, (_, i) => makeWord(i + 1));
}

function makeStarterPackJson(words: WordItem[]): string {
  return JSON.stringify({ words });
}

function makeWordJson(word: WordItem): string {
  return JSON.stringify(word);
}

function makeStat(word: WordItem): RoundSwipeStat {
  return {
    round: 1,
    playerId: 'p1',
    team: 'A',
    direction: 'up',
    awardedPoints: 1,
    word,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let wordService: WordService;

beforeEach(() => {
  vi.clearAllMocks();

  // Sensible defaults
  vi.mocked(redisClient.llen).mockResolvedValue(0);
  vi.mocked(redisClient.lpop).mockResolvedValue(null);
  vi.mocked(redisClient.smembers).mockResolvedValue([]);
  vi.mocked(redisClient.lrange).mockResolvedValue([]);

  wordService = new WordService();
});

// ===========================================================================
// loadStarterPack
// ===========================================================================

describe('loadStarterPack', () => {
  it('parses a valid JSON file successfully', async () => {
    const words = makeWords(3);
    vi.mocked(readFile).mockResolvedValueOnce(makeStarterPackJson(words) as any);

    const result = await wordService.loadStarterPack();

    expect(result).toEqual(words);
  });

  it('returns cached words on second call without calling readFile again', async () => {
    const words = makeWords(2);
    vi.mocked(readFile).mockResolvedValueOnce(makeStarterPackJson(words) as any);

    const first = await wordService.loadStarterPack();
    const second = await wordService.loadStarterPack();

    // readFile should have been called exactly once — second call used cache
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('parses JSON wrapped in a markdown fence', async () => {
    const words = makeWords(2);
    const fenced = `\`\`\`json\n${makeStarterPackJson(words)}\n\`\`\``;
    vi.mocked(readFile).mockResolvedValueOnce(fenced as any);

    const result = await wordService.loadStarterPack();

    expect(result).toEqual(words);
  });

  it('tries the next path candidate when the first fails', async () => {
    const words = makeWords(2);
    vi.mocked(readFile)
      .mockRejectedValueOnce(new Error('ENOENT'))
      .mockResolvedValueOnce(makeStarterPackJson(words) as any);

    const result = await wordService.loadStarterPack();

    expect(result).toEqual(words);
    expect(vi.mocked(readFile)).toHaveBeenCalledTimes(2);
  });

  it('throws RoomServiceError WORDS_NOT_AVAILABLE (500) when all paths fail', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

    let caught: unknown;
    try {
      await wordService.loadStarterPack();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(RoomServiceError);
    expect(caught).toMatchObject({ code: 'WORDS_NOT_AVAILABLE', statusCode: 500 });
  });

  it('throws RoomServiceError WORDS_NOT_AVAILABLE (500) when the file has an empty words array', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ words: [] }) as any);

    await expect(wordService.loadStarterPack()).rejects.toMatchObject({
      code: 'WORDS_NOT_AVAILABLE',
      statusCode: 500,
    });
  });
});

// ===========================================================================
// shuffleWords
// ===========================================================================

describe('shuffleWords', () => {
  it('returns an array with the same elements', () => {
    const words = makeWords(10);
    const shuffled = wordService.shuffleWords(words);

    expect(shuffled).toHaveLength(words.length);
    for (const w of words) {
      expect(shuffled).toContainEqual(w);
    }
  });

  it('does NOT mutate the input array', () => {
    const words = makeWords(5);
    const copy = [...words];
    wordService.shuffleWords(words);

    expect(words).toEqual(copy);
  });

  it('returns a single-element array unchanged', () => {
    const words = [makeWord(1)];
    expect(wordService.shuffleWords(words)).toEqual(words);
  });

  it('returns an empty array unchanged', () => {
    expect(wordService.shuffleWords([])).toEqual([]);
  });

  it('produces a different order for a large array', () => {
    const words = makeWords(20);
    const shuffled = wordService.shuffleWords(words);
    // With 20 elements, probability of identical order is 1/20! ≈ 0
    expect(shuffled).not.toEqual(words);
  });
});

// ===========================================================================
// getRandomWord
// ===========================================================================

describe('getRandomWord', () => {
  const roomId = 'room1';

  it('returns a word and calls markWordUsed when the queue has items', async () => {
    const word = makeWord(42);
    vi.mocked(redisClient.llen).mockResolvedValue(5);
    vi.mocked(redisClient.lpop).mockResolvedValue(makeWordJson(word) as any);

    const result = await wordService.getRandomWord(roomId);

    expect(result).toEqual(word);
    expect(redisClient.sadd).toHaveBeenCalledWith(`room:${roomId}:used_words`, String(word.id));
    expect(redisClient.expire).toHaveBeenCalledWith(
      `room:${roomId}:used_words`,
      24 * 60 * 60,
    );
  });

  it('loads pack, filters used words, and pushes to queue when the queue is empty', async () => {
    const words = makeWords(5);
    const usedId = String(words[0].id);

    // Queue is empty → triggers re-fill
    vi.mocked(redisClient.llen).mockResolvedValue(0);
    vi.mocked(redisClient.smembers).mockResolvedValue([usedId] as any);
    vi.mocked(readFile).mockResolvedValue(makeStarterPackJson(words) as any);

    const availableWord = words[1]; // any non-used word
    vi.mocked(redisClient.lpop).mockResolvedValue(makeWordJson(availableWord) as any);

    const result = await wordService.getRandomWord(roomId);

    // rpush should have been called with 4 words (5 minus the 1 used)
    expect(redisClient.rpush).toHaveBeenCalled();
    const rpushArgs = vi.mocked(redisClient.rpush).mock.calls[0];
    // first arg is the key, rest are the serialised words
    expect(rpushArgs[0]).toBe(`room:${roomId}:word_queue`);
    expect(rpushArgs.length - 1).toBe(4); // 4 available words pushed

    expect(redisClient.expire).toHaveBeenCalledWith(
      `room:${roomId}:word_queue`,
      24 * 60 * 60, // WORD_DATA_TTL_SECONDS
    );
    expect(result).toEqual(availableWord);
  });

  it('throws NO_WORDS_AVAILABLE (409) when all words are used', async () => {
    const words = makeWords(3);
    const allUsedIds = words.map((w) => String(w.id));

    vi.mocked(redisClient.llen).mockResolvedValue(0);
    vi.mocked(redisClient.smembers).mockResolvedValue(allUsedIds as any);
    vi.mocked(readFile).mockResolvedValue(makeStarterPackJson(words) as any);

    await expect(wordService.getRandomWord(roomId)).rejects.toMatchObject({
      code: 'NO_WORDS_AVAILABLE',
      statusCode: 409,
    });
  });

  it('throws NO_WORDS_AVAILABLE (409) when lpop returns null (race condition)', async () => {
    const words = makeWords(3);
    vi.mocked(redisClient.llen).mockResolvedValue(3);
    vi.mocked(redisClient.lpop).mockResolvedValue(null as any);

    await expect(wordService.getRandomWord(roomId)).rejects.toMatchObject({
      code: 'NO_WORDS_AVAILABLE',
      statusCode: 409,
    });
  });
});

// ===========================================================================
// markWordUsed
// ===========================================================================

describe('markWordUsed', () => {
  const roomId = 'room1';

  it('calls sadd with the correct key and word ID as a string', async () => {
    await wordService.markWordUsed(roomId, 7);

    expect(redisClient.sadd).toHaveBeenCalledWith(`room:${roomId}:used_words`, '7');
  });

  it('calls expire with WORD_DATA_TTL_SECONDS', async () => {
    await wordService.markWordUsed(roomId, 7);

    expect(redisClient.expire).toHaveBeenCalledWith(
      `room:${roomId}:used_words`,
      WORD_DATA_TTL_SECONDS,
    );
  });
});

// ===========================================================================
// resetUsedWords
// ===========================================================================

describe('resetUsedWords', () => {
  it('calls del with both usedWordsKey AND wordQueueKey', async () => {
    const roomId = 'room1';
    await wordService.resetUsedWords(roomId);

    expect(redisClient.del).toHaveBeenCalledWith(
      `room:${roomId}:used_words`,
      `room:${roomId}:word_queue`,
    );
  });
});

// ===========================================================================
// resetWordQueue
// ===========================================================================

describe('resetWordQueue', () => {
  it('calls del with only wordQueueKey', async () => {
    const roomId = 'room1';
    await wordService.resetWordQueue(roomId);

    expect(redisClient.del).toHaveBeenCalledWith(`room:${roomId}:word_queue`);
    expect(redisClient.del).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// markPreserveUsedWordsOnNextStart
// ===========================================================================

describe('markPreserveUsedWordsOnNextStart', () => {
  it('calls set with preserveUsedWordsOnStartKey, "1", "EX", TTL', async () => {
    const roomId = 'room1';
    await wordService.markPreserveUsedWordsOnNextStart(roomId);

    expect(redisClient.set).toHaveBeenCalledWith(
      `room:${roomId}:preserve_used_words_on_start`,
      '1',
      'EX',
      WORD_DATA_TTL_SECONDS,
    );
  });
});

// ===========================================================================
// consumePreserveUsedWordsOnNextStart
// ===========================================================================

describe('consumePreserveUsedWordsOnNextStart', () => {
  const roomId = 'room1';
  const key = `room:${roomId}:preserve_used_words_on_start`;

  it('returns true and deletes the key when value is "1"', async () => {
    vi.mocked(redisClient.get).mockResolvedValue('1');

    const result = await wordService.consumePreserveUsedWordsOnNextStart(roomId);

    expect(result).toBe(true);
    expect(redisClient.del).toHaveBeenCalledWith(key);
  });

  it('returns false and does NOT delete the key when value is null', async () => {
    vi.mocked(redisClient.get).mockResolvedValue(null);

    const result = await wordService.consumePreserveUsedWordsOnNextStart(roomId);

    expect(result).toBe(false);
    expect(redisClient.del).not.toHaveBeenCalled();
  });

  it('returns false and does NOT delete the key when value is some other string', async () => {
    vi.mocked(redisClient.get).mockResolvedValue('0');

    const result = await wordService.consumePreserveUsedWordsOnNextStart(roomId);

    expect(result).toBe(false);
    expect(redisClient.del).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// resetRoundStats
// ===========================================================================

describe('resetRoundStats', () => {
  it('calls del with the correct roundStatsKey', async () => {
    const roomId = 'room1';
    const round = 3;
    await wordService.resetRoundStats(roomId, round);

    expect(redisClient.del).toHaveBeenCalledWith(`room:${roomId}:round:${round}:stats`);
  });
});

// ===========================================================================
// appendRoundStat
// ===========================================================================

describe('appendRoundStat', () => {
  const roomId = 'room1';
  const round = 2;

  it('calls rpush with the JSON-serialized stat', async () => {
    const word = makeWord(1);
    const stat = makeStat(word);
    await wordService.appendRoundStat(roomId, round, stat);

    expect(redisClient.rpush).toHaveBeenCalledWith(
      `room:${roomId}:round:${round}:stats`,
      JSON.stringify(stat),
    );
  });

  it('calls expire with WORD_DATA_TTL_SECONDS', async () => {
    const word = makeWord(1);
    const stat = makeStat(word);
    await wordService.appendRoundStat(roomId, round, stat);

    expect(redisClient.expire).toHaveBeenCalledWith(
      `room:${roomId}:round:${round}:stats`,
      WORD_DATA_TTL_SECONDS,
    );
  });
});

// ===========================================================================
// getRoundStats
// ===========================================================================

describe('getRoundStats', () => {
  const roomId = 'room1';
  const round = 1;

  it('returns an empty array when lrange returns []', async () => {
    vi.mocked(redisClient.lrange).mockResolvedValue([]);

    const result = await wordService.getRoundStats(roomId, round);

    expect(result).toEqual([]);
  });

  it('returns a parsed array of RoundSwipeStat objects', async () => {
    const word = makeWord(1);
    const stat = makeStat(word);
    vi.mocked(redisClient.lrange).mockResolvedValue([JSON.stringify(stat)] as any);

    const result = await wordService.getRoundStats(roomId, round);

    expect(result).toEqual([stat]);
  });

  it('filters out items that fail JSON parsing', async () => {
    const word = makeWord(1);
    const stat = makeStat(word);
    vi.mocked(redisClient.lrange).mockResolvedValue([
      'not-valid-json{{{',
      JSON.stringify(stat),
    ] as any);

    const result = await wordService.getRoundStats(roomId, round);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(stat);
  });
});
