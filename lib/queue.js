// A fair waiting line for AI answers, shared by all servers (needs Redis; without it there is no line).
// Only QUEUE_SLOTS answers are made at the same time; everyone else waits in order and sees their number.
// Priority: Pro users first, then voice (people are talking live), then short questions.
import { redis, hasRedis } from "./redis";
import { keyCount } from "./gemini";
import { serverEnv } from "./env";

const Q = "aq:line", ACT = "aq:active", BEAT = "aq:beat";
const RUN_MS = 90_000; // a running answer frees its slot after this, even if its server died

// Atomic: clean up, then either give me a slot (0), tell my place in line (1, 2, …) or say I'm not in line (-2).
const TURN = `
local q, act, beat = KEYS[1], KEYS[2], KEYS[3]
local me, now, slots, ttl = ARGV[1], tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
redis.call('ZREMRANGEBYSCORE', act, '-inf', now)
local stale = redis.call('ZRANGEBYSCORE', beat, '-inf', now - 12000)
for _, m in ipairs(stale) do redis.call('ZREM', q, m); redis.call('ZREM', beat, m) end
if not redis.call('ZSCORE', q, me) then return -2 end
redis.call('ZADD', beat, now, me)
local free = slots - redis.call('ZCARD', act)
local rank = redis.call('ZRANK', q, me)
if rank < free then
  redis.call('ZREM', q, me)
  redis.call('ZREM', beat, me)
  redis.call('ZADD', act, now + ttl, me)
  return 0
end
return rank - math.max(free, 0) + 1`;

const slots = () => Math.max(1, Number(serverEnv("QUEUE_SLOTS")) || 10 * keyCount());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Earlier score = served earlier.
export function priorityScore({ pro, voice, short }) {
  return Date.now() - (pro ? 20_000 : 0) - (voice ? 8_000 : 0) - (short ? 3_000 : 0);
}

// Waits for a free slot. onPlace(n) is called with the place in line while waiting.
// Gives up waiting after maxWaitMs and goes ahead anyway (the AI may still have room).
export async function waitTurn(id, score, { onPlace, maxWaitMs = 20_000 } = {}) {
  if (!hasRedis()) return;
  const join = () => redis("ZADD", Q, score, id).then(() => redis("ZADD", BEAT, Date.now(), id));
  await join();
  const until = Date.now() + maxWaitMs;
  let last = 0;
  while (true) {
    const r = await redis("EVAL", TURN, 3, Q, ACT, BEAT, id, Date.now(), slots(), RUN_MS);
    if (r === undefined || r === 0) return; // Redis down, or my turn
    if (r === -2) { await join(); continue; }
    if (r !== last) { last = r; onPlace?.(r); }
    if (Date.now() > until) { await redis("ZREM", Q, id); await redis("ZREM", BEAT, id); return; }
    await sleep(r <= 3 ? 700 : 1500);
  }
}

// Frees the slot when the answer is finished.
export const doneTurn = (id) => (hasRedis() ? redis("ZREM", ACT, id) : undefined);

// How many people are waiting / being answered right now (for the owner's dashboard).
export async function lineStats() {
  if (!hasRedis()) return null;
  const now = Date.now();
  await redis("ZREMRANGEBYSCORE", ACT, "-inf", now);
  const [waiting, active] = await Promise.all([redis("ZCARD", Q), redis("ZCARD", ACT)]);
  return { waiting: waiting || 0, active: active || 0, slots: slots() };
}
