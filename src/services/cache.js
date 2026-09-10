import NodeCache from "node-cache";

const quoteTTL = Number(process.env.QUOTE_CACHE_TTL || 15);
const fundamentalTTL = Number(process.env.FUNDAMENTAL_CACHE_TTL || 21600);

export const quoteCache = new NodeCache({
  stdTTL: quoteTTL,
  checkperiod: Math.max(5, Math.floor(quoteTTL / 2)),
  useClones: false
});

export const fundamentalCache = new NodeCache({
  stdTTL: fundamentalTTL,
  checkperiod: Math.max(60, Math.floor(fundamentalTTL / 4)),
  useClones: false
});

export const getCached = (cache, key) => cache.get(key);

export const setCached = (cache, key, value, ttl) => {
  cache.set(key, value, ttl);
  return value;
};
