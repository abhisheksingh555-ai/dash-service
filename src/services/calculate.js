const round = (value, decimals = 2) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return null;
  }

  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const safeNumber = (value, field) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Invalid ${field}`);
  }

  return number;
};

export function calculateHolding(holding, market = {}) {
  const purchasePrice = safeNumber(holding.purchasePrice, "purchasePrice");
  const qty = safeNumber(holding.qty, "qty");

  const investment = purchasePrice * qty;
  const cmp = market.cmp == null ? null : safeNumber(market.cmp, "cmp");

  const presentValue = cmp === null ? null : cmp * qty;
  const gainLoss = presentValue === null ? null : presentValue - investment;

  return {
    particulars: holding.particulars,
    sector: holding.sector,
    exchangeCode: holding.exchangeCode,
    purchasePrice: round(purchasePrice),
    qty,
    investment: round(investment),
    portfolioPercentage: 0,
    cmp: round(cmp),
    presentValue: round(presentValue),
    gainLoss: round(gainLoss),
    peRatio: market.peRatio == null ? null : round(market.peRatio),
    latestEarnings:
      market.latestEarnings == null ? null : round(market.latestEarnings),
    marketData: {
      quoteSource: market.quoteSource || null,
      fundamentalsSource: market.fundamentalsSource || null,
      quoteError: market.quoteError || null,
      fundamentalsError: market.fundamentalsError || null,
      fetchedAt: market.fetchedAt || null
    }
  };
}

export function calculatePortfolio(holdings, marketData = new Map()) {
  const calculated = holdings.map((holding) =>
    calculateHolding(
      holding,
      marketData.get(String(holding.exchangeCode).toUpperCase()) || {}
    )
  );

  const totalInvestment = calculated.reduce(
    (sum, holding) => sum + holding.investment,
    0
  );

  for (const holding of calculated) {
    holding.portfolioPercentage =
      totalInvestment > 0
        ? round((holding.investment / totalInvestment) * 100)
        : 0;
  }

  const sectorMap = new Map();

  for (const holding of calculated) {
    const sector = holding.sector || "Uncategorized";

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, []);
    }

    sectorMap.get(sector).push(holding);
  }

  const sectors = [...sectorMap.entries()].map(([name, sectorHoldings]) => ({
    name,
    holdings: sectorHoldings,
    totals: calculateTotals(sectorHoldings)
  }));

  return {
    sectors,
    grandTotal: calculateTotals(calculated)
  };
}

function calculateTotals(holdings) {
  const investment = holdings.reduce(
    (sum, holding) => sum + (holding.investment || 0),
    0
  );

  const presentValueKnown = holdings.some((holding) => holding.presentValue !== null);
  const gainLossKnown = holdings.some((holding) => holding.gainLoss !== null);

  const presentValue = holdings.reduce(
    (sum, holding) => sum + (holding.presentValue || 0),
    0
  );

  const gainLoss = holdings.reduce(
    (sum, holding) => sum + (holding.gainLoss || 0),
    0
  );

  return {
    investment: round(investment),
    presentValue: presentValueKnown ? round(presentValue) : null,
    gainLoss: gainLossKnown ? round(gainLoss) : null
  };
}
