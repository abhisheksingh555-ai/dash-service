import axios from "axios";
import { getCached, quoteCache, setCached } from "./cache.js";

const timeout = Number(process.env.MARKET_DATA_TIMEOUT || 8000);

const normalizeSymbol = (symbol) => {
  const value = String(symbol || "").trim().toUpperCase();
  if (!/^[A-Z0-9._-]+$/.test(value)) {
    throw new Error("Invalid symbol");
  }
  return value;
};

const yahooSymbol = (symbol) => {
  const normalized = normalizeSymbol(symbol);
  // Indian NSE symbols normally need the .NS suffix for Yahoo Finance.
  if (normalized.endsWith(".NS") || normalized.endsWith(".BO")) return normalized;
  return `${normalized}.NS`;
};

export async function fetchYahooQuote(symbol) {
  const normalized = normalizeSymbol(symbol);
  const cacheKey = `quote:${normalized}`;
  const cached = getCached(quoteCache, cacheKey);

  if (cached) return cached;

  const ticker = yahooSymbol(normalized);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;

  try {
    const response = await axios.get(url, {
      timeout,
      headers: {
        "User-Agent": "Mozilla/5.0 PortfolioDashboard/1.0",
        Accept: "application/json"
      },
      params: {
        interval: "1d",
        range: "1d"
      }
    });

    const result = response.data?.chart?.result?.[0];
    const meta = result?.meta;

    const cmp =
      Number(meta?.regularMarketPrice) ||
      Number(result?.indicators?.quote?.[0]?.close?.at(-1));

    if (!Number.isFinite(cmp)) {
      throw new Error("CMP not available from Yahoo Finance");
    }

    const data = {
      symbol: normalized,
      yahooSymbol: ticker,
      cmp,
      currency: meta?.currency || "INR",
      exchange: meta?.exchangeName || null,
      marketState: meta?.marketState || null,
      source: "Yahoo Finance",
      fetchedAt: new Date().toISOString()
    };

    return setCached(quoteCache, cacheKey, data);
  } catch (error) {
    throw new Error(
      `Yahoo quote failed for ${normalized}: ${error.response?.status || error.message}`
    );
  }
}

export async function fetchYahooQuotes(symbols) {
  const uniqueSymbols = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];

  const results = await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      try {
        return await fetchYahooQuote(symbol);
      } catch (error) {
        return {
          symbol,
          cmp: null,
          source: "Yahoo Finance",
          error: error.message,
          fetchedAt: new Date().toISOString()
        };
      }
    })
  );

  return results;
}
