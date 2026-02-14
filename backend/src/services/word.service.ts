import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { redisClient } from '../config/redis';
import { RoundSwipeStat, WordItem } from '../models';
import { RoomServiceError } from './room.service';

type StarterPackPayload = {
  words: WordItem[];
};

const ROOM_USED_WORDS_PREFIX = 'room:';
const ROUND_STATS_PREFIX = 'room:';
const WORD_QUEUE_PREFIX = 'room:';
const WORD_DATA_TTL_SECONDS = 24 * 60 * 60;

const usedWordsKey = (roomId: string): string => `${ROOM_USED_WORDS_PREFIX}${roomId}:used_words`;
const roundStatsKey = (roomId: string, round: number): string =>
  `${ROUND_STATS_PREFIX}${roomId}:round:${round}:stats`;
const wordQueueKey = (roomId: string): string => `${WORD_QUEUE_PREFIX}${roomId}:word_queue`;

const STARTER_PACK_PATH_CANDIDATES = [
  process.env.STARTER_PACK_PATH,
  path.resolve(process.cwd(), 'docs/MVP_Starter_pack.json'),
  path.resolve(process.cwd(), '../docs/MVP_Starter_pack.json'),
  path.resolve(__dirname, '../../docs/MVP_Starter_pack.json'),
  path.resolve(__dirname, '../../../docs/MVP_Starter_pack.json')
].filter((value): value is string => Boolean(value));

const stripMarkdownFence = (raw: string): string => {
  const trimmed = raw.trim();

  if (!trimmed.startsWith('```')) {
    return raw;
  }

  const lines = trimmed.split('\n');
  const opening = lines[0].trim();
  const closing = lines[lines.length - 1].trim();

  if (!opening.startsWith('```') || closing !== '```') {
    return raw;
  }

  return lines.slice(1, -1).join('\n');
};

const parseStarterPack = (raw: string): StarterPackPayload => {
  try {
    return JSON.parse(raw) as StarterPackPayload;
  } catch {
    const normalized = stripMarkdownFence(raw);
    return JSON.parse(normalized) as StarterPackPayload;
  }
};

export class WordService {
  private cachedWords: WordItem[] | null = null;

  async loadStarterPack(): Promise<WordItem[]> {
    if (this.cachedWords) {
      return this.cachedWords;
    }

    for (const filePath of STARTER_PACK_PATH_CANDIDATES) {
      try {
        const raw = await readFile(filePath, 'utf-8');
        const parsed = parseStarterPack(raw);

        if (!Array.isArray(parsed.words) || parsed.words.length === 0) {
          throw new Error('Empty words pack');
        }

        this.cachedWords = parsed.words;
        return this.cachedWords;
      } catch {
        // Try next candidate path.
      }
    }

    throw new RoomServiceError(
      'WORDS_NOT_AVAILABLE',
      `Starter words pack is not available (checked: ${STARTER_PACK_PATH_CANDIDATES.join(', ')})`,
      500
    );
  }

  shuffleWords(words: WordItem[]): WordItem[] {
    const shuffled = [...words];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  async getRandomWord(roomId: string): Promise<WordItem> {
    const queueKey = wordQueueKey(roomId);
    const queueSize = await redisClient.llen(queueKey);

    if (queueSize <= 0) {
      const words = await this.loadStarterPack();
      const shuffled = this.shuffleWords(words);
      const payload = shuffled.map((word) => JSON.stringify(word));

      if (payload.length === 0) {
        throw new RoomServiceError('NO_WORDS_AVAILABLE', 'No words available for this round', 409);
      }

      await redisClient.rpush(queueKey, ...payload);
      await redisClient.expire(queueKey, WORD_DATA_TTL_SECONDS);
    }

    const nextWordRaw = await redisClient.lpop(queueKey);
    if (!nextWordRaw) {
      throw new RoomServiceError('NO_WORDS_AVAILABLE', 'No words available for this round', 409);
    }

    return JSON.parse(nextWordRaw) as WordItem;
  }

  async markWordUsed(roomId: string, wordId: number): Promise<void> {
    await redisClient.sadd(usedWordsKey(roomId), String(wordId));
    await redisClient.expire(usedWordsKey(roomId), WORD_DATA_TTL_SECONDS);
  }

  async resetUsedWords(roomId: string): Promise<void> {
    await redisClient.del(usedWordsKey(roomId), wordQueueKey(roomId));
  }

  async resetRoundStats(roomId: string, round: number): Promise<void> {
    await redisClient.del(roundStatsKey(roomId, round));
  }

  async appendRoundStat(roomId: string, round: number, stat: RoundSwipeStat): Promise<void> {
    const key = roundStatsKey(roomId, round);
    await redisClient.rpush(key, JSON.stringify(stat));
    await redisClient.expire(key, WORD_DATA_TTL_SECONDS);
  }
}
