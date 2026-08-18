const DEFAULT_TIMEOUT_MS = 8000;

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.prices)) return payload.prices;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function normalizeExternalPrice(item, index) {
  const productTitle = item.productTitle || item.product_name || item.commodity || item.name || item.title;
  const currentPrice = Number(item.currentPrice ?? item.current_price ?? item.price ?? item.value);
  if (!productTitle || !Number.isFinite(currentPrice) || currentPrice <= 0) return null;

  const previousPrice = Number(item.previousPrice ?? item.previous_price ?? currentPrice);
  const safePreviousPrice = Number.isFinite(previousPrice) && previousPrice > 0 ? previousPrice : currentPrice;
  const priceChange = Number(item.priceChange ?? item.price_change ?? currentPrice - safePreviousPrice);
  const safePriceChange = Number.isFinite(priceChange) ? priceChange : 0;
  const priceChangePercent = Number(item.priceChangePercent ?? item.price_change_percent ?? (safePriceChange / safePreviousPrice) * 100);

  const rawRegions = item.regions || item.zones || item.regionalPrices || item.regional_prices;
  const regions = Array.isArray(rawRegions)
    ? rawRegions.map(region => {
        const price = Number(region.price ?? region.currentPrice ?? region.current_price);
        const change = Number(region.change ?? region.priceChangePercent ?? region.price_change_percent ?? 0);
        if (!Number.isFinite(price) || price <= 0) return null;
        return {
          zone: String(region.zone || region.region || region.name || 'Zone inconnue'),
          price,
          change: Number.isFinite(change) ? change : 0,
          trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        };
      }).filter(Boolean)
    : [];

  return {
    productId: String(item.productId || item.product_id || item.id || `external-${index}-${String(productTitle).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
    productTitle: String(productTitle),
    category: String(item.category || item.commodity_group || 'Marché externe'),
    currentPrice,
    previousPrice: safePreviousPrice,
    priceChange: safePriceChange,
    priceChangePercent: Number.isFinite(priceChangePercent) ? priceChangePercent : 0,
    unit: String(item.unit || item.currency_unit || 'unité'),
    timestamp: item.timestamp || item.updatedAt || item.updated_at || new Date().toISOString(),
    trend: safePriceChange > 0 ? 'up' : safePriceChange < 0 ? 'down' : 'stable',
    regions,
  };
}

async function getExternalMarketPrices() {
  const url = process.env.MARKET_EXTERNAL_API_URL?.trim();
  if (!url) {
    const error = new Error('MARKET_EXTERNAL_API_URL is not configured');
    error.code = 'EXTERNAL_MARKET_NOT_CONFIGURED';
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MARKET_EXTERNAL_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  const headers = { Accept: 'application/json' };
  if (process.env.MARKET_EXTERNAL_API_KEY) {
    headers.Authorization = `Bearer ${process.env.MARKET_EXTERNAL_API_KEY}`;
  }

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`External market API responded with ${response.status}`);

    const payload = await response.json();
    const prices = extractItems(payload).map(normalizeExternalPrice).filter(Boolean);
    if (prices.length === 0) throw new Error('External market API returned no valid prices');

    return { prices, fetchedAt: new Date().toISOString() };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getExternalMarketPrices };
