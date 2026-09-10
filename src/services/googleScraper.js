import axios from "axios";
import * as cheerio from "cheerio";
import { fundamentalCache, getCached, setCached } from "./cache.js";

const timeout = Number(process.env.MARKET_DATA_TIMEOUT || 8000);

const normalizeSymbol = (symbol) => {
  const value = String(symbol || "").trim().toUpperCase();
  if (!/^[A-Z0-9._-]+$/.test(value)) {
    throw new Error("Invalid symbol");
  }
  return value;
};

const parseNumber = (value) => {
  if (value == null) return null;
  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
};

const findLabelValue = ($, labels) => {
  let result = null;

  $("div, span, td, th").each((_, element) => {
    if (result !== null) return;

    const text = $(element).text().replace(/\s+/g, " ").trim();
    if (!labels.some((label) => text.toLowerCase() === label.toLowerCase())) return;

    const parentText = $(element).parent().text().replace(/\s+/g, " ").trim();
    const number = parseNumber(parentText.replace(text, ""));
    if (number !== null) result = number;
  });

  return result;
};

export async function fetchGoogleFundamentals(symbol) {
  const normalized = normalizeSymbol(symbol);
  const cacheKey = `fundamental:${normalized}`;
  const cached = getCached(fundamentalCache, cacheKey);

  if (cached) return cached;

  // Google Finance's HTML structure can change. Keep this scraper isolated.
  const url = `https://www.google.com/finance/quote/${encodeURIComponent(normalized)}:NSE`;

  try {
    const response = await axios.get(url, {
      timeout,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        Accept: "text/html,application/xhtml+xml"
      }
    });

    const $ = cheerio.load(response.data);

    const pageText = $("body").text().replace(/\s+/g, " ");

    const peMatch = pageText.match(/P\/E ratio\s*([0-9]+(?:\.[0-9]+)?)/i);
    const earningsMatch = pageText.match(
      /(?:Earnings per share|EPS)\s*([0-9]+(?:\.[0-9]+)?)/i
    );

    const peRatio =
      parseNumber(peMatch?.[1]) ??
      findLabelValue($, ["P/E ratio", "Price/Earnings ratio"]);

    const latestEarnings =
      parseNumber(earningsMatch?.[1]) ??
      findLabelValue($, ["Earnings per share", "EPS"]);

    const data = {
      symbol: normalized,
      peRatio,
      latestEarnings,
      source: "Google Finance",
      fetchedAt: new Date().toISOString(),
      warning:
        peRatio === null && latestEarnings === null
          ? "Google Finance structure may have changed or data is unavailable."
          : null
    };

    return setCached(fundamentalCache, cacheKey, data);
  } catch (error) {
    throw new Error(
      `Google fundamentals failed for ${normalized}: ${
        error.response?.status || error.message
      }`
    );
  }
}

export async function fetchGoogleFundamentalsBatch(symbols) {
  const uniqueSymbols = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];

  return Promise.all(
    uniqueSymbols.map(async (symbol) => {
      try {
        return await fetchGoogleFundamentals(symbol);
      } catch (error) {
        return {
          symbol,
          peRatio: null,
          latestEarnings: null,
          source: "Google Finance",
          error: error.message,
          fetchedAt: new Date().toISOString()
        };
      }
    })
  );
}
