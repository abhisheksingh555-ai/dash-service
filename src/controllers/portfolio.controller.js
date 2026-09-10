import holdings from "../data/holdings.json" with { type: "json" };
import { calculatePortfolio } from "../services/calculate.js";
import { fetchYahooQuotes } from "../services/yahooScraper.js";
import { fetchGoogleFundamentalsBatch } from "../services/googleScraper.js";

const symbolList = () =>
  [...new Set(
    holdings
      .map((holding) => String(holding.exchangeCode || "").trim().toUpperCase())
      .filter(Boolean)
  )];

const createMarketMap = (quotes, fundamentals) => {
  const map = new Map();

  for (const quote of quotes) {
    map.set(quote.symbol, {
      cmp: quote.cmp,
      quoteSource: quote.source,
      quoteError: quote.error || null,
      fetchedAt: quote.fetchedAt
    });
  }

  for (const fundamental of fundamentals) {
    const existing = map.get(fundamental.symbol) || {};

    map.set(fundamental.symbol, {
      ...existing,
      peRatio: fundamental.peRatio,
      latestEarnings: fundamental.latestEarnings,
      fundamentalsSource: fundamental.source,
      fundamentalsError: fundamental.error || fundamental.warning || null,
      fetchedAt: fundamental.fetchedAt || existing.fetchedAt
    });
  }

  return map;
};

export const getPortfolio = async (req, res, next) => {
  try {
    const symbols = symbolList();

    const [quotes, fundamentals] = await Promise.all([
      fetchYahooQuotes(symbols),
      fetchGoogleFundamentalsBatch(symbols)
    ]);

    const marketMap = createMarketMap(quotes, fundamentals);
    const portfolio = calculatePortfolio(holdings, marketMap);

    return res.status(200).json({
      success: true,
      message: "Portfolio fetched successfully",
      data: portfolio,
      meta: {
        holdingCount: holdings.length,
        symbolCount: symbols.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getQuotes = async (req, res, next) => {
  try {
    const requested = String(req.query.symbols || "")
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean);

    const symbols = requested.length ? requested : symbolList();
    const quotes = await fetchYahooQuotes(symbols);

    return res.status(200).json({
      success: true,
      data: quotes,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getFundamentals = async (req, res, next) => {
  try {
    const requested = String(req.query.symbols || "")
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean);

    const symbols = requested.length ? requested : symbolList();
    const fundamentals = await fetchGoogleFundamentalsBatch(symbols);

    return res.status(200).json({
      success: true,
      data: fundamentals,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return next(error);
  }
};
