const prisma = require('../config/prisma');
const AI_PREDICTION_API_URL = (process.env.AI_PREDICTION_API_URL || 'http://localhost:8001').replace(/\/$/, '');
const LLM_API_URL = (process.env.LLM_API_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
const LLM_MODEL = process.env.LLM_MODEL || 'llama3';

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildTrendSeries(base, drift = 0, points = 8) {
  return Array.from({ length: points }, (_, index) => {
    const value = base + drift * index + Math.sin(index / 2) * 18;
    return {
      date: `J+${index + 1}`,
      price: Number(value.toFixed(2)),
      y: Number(value.toFixed(2)),
    };
  });
}

async function callAiService(path, payload, method = 'POST') {
  const response = await fetch(`${AI_PREDICTION_API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(payload),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = data?.detail || data?.message || `AI service error (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function getYieldFallback(region = 'national') {
  const base = {
    national: 4200,
    north: 4600,
    centre: 4100,
    south: 3900,
    west: 4400,
  };

  const estimate = base[region] ?? base.national;
  const series = buildTrendSeries(estimate, 20, 10).map((point) => ({
    date: point.date,
    yield: point.price,
    y: point.price,
  }));

  return {
    series,
    estimate,
    current: estimate,
    region,
  };
}

function getPriceFallback(productId = '1') {
  const base = {
    1: 520,
    2: 410,
    3: 310,
    4: 680,
    5: 760,
  };

  const price = base[String(productId)] ?? 500;
  const series = buildTrendSeries(price, 6, 10).map((point) => ({
    date: point.date,
    price: point.price,
    y: point.price,
  }));

  return {
    series,
    current: price,
    estimate: price,
  };
}

async function getAiHealth(req, res) {
  return res.json({
    status: 'ok',
    service: 'agriconnect-ai-gateway',
    upstream: AI_PREDICTION_API_URL,
  });
}

async function getYieldForecast(req, res) {
  const region = String(req.params.region || 'national').toLowerCase();
  const payload = {
    temperature: 27.5,
    rainfall: 900,
    humidity: 70,
    soil_moisture: 60,
    nitrogen: 120,
    phosphorus: 35,
    potassium: 150,
    ph: 6.3,
    field_area_ha: 2.5,
  };

  try {
    const prediction = await callAiService('/predict', payload);
    const estimate = toNumber(prediction.predicted_yield, 4200);
    const series = buildTrendSeries(estimate, 22, 10).map((point) => ({
      date: point.date,
      yield: point.price,
      y: point.price,
    }));

    return res.json({
      series,
      estimate,
      current: estimate,
      region,
      source: 'fastapi-model',
    });
  } catch (error) {
    const fallback = getYieldFallback(region);
    return res.json({
      ...fallback,
      source: 'fallback',
      warning: error.message,
    });
  }
}

async function getPriceForecast(req, res) {
  const productId = String(req.params.productId || '1');
  const productMap = {
    1: 'Maize',
    2: 'Rice',
    3: 'Cassava',
    4: 'Tomato',
    5: 'Groundnut',
  };

  const payload = {
    market: 'Yaoundé',
    commodity: productMap[productId] || 'Maize',
    pricetype: 'Retail',
    recent_prices: [480, 510, 495, 530, 525, 540, 545],
    target_month: 6,
    rainfall_last_month_mm: 120,
    temp_last_month_c: 26.5,
  };

  try {
    const prediction = await callAiService('/api/price-prediction/predict', payload);
    const current = toNumber(prediction.predicted_price, 500);
    const series = buildTrendSeries(current, 6, 10).map((point) => ({
      date: point.date,
      price: point.price,
      y: point.price,
    }));

    return res.json({
      series,
      current,
      estimate: current,
      source: 'fastapi-model',
    });
  } catch (error) {
    const fallback = getPriceFallback(productId);
    return res.json({
      ...fallback,
      source: 'fallback',
      warning: error.message,
    });
  }
}

async function getRecommendations(req, res) {
  const productId = String(req.params.productId || '1');
  const productMap = {
    1: { rainfall_mm: 950, temperature_c: 28, humidity_pct: 72, soil_ph: 6.2, nitrogen_kg_ha: 120, phosphorus_kg_ha: 32, potassium_kg_ha: 150 },
    2: { rainfall_mm: 1350, temperature_c: 27, humidity_pct: 80, soil_ph: 5.9, nitrogen_kg_ha: 110, phosphorus_kg_ha: 30, potassium_kg_ha: 140 },
    3: { rainfall_mm: 980, temperature_c: 29, humidity_pct: 72, soil_ph: 6.1, nitrogen_kg_ha: 80, phosphorus_kg_ha: 20, potassium_kg_ha: 110 },
    4: { rainfall_mm: 770, temperature_c: 25, humidity_pct: 70, soil_ph: 6.5, nitrogen_kg_ha: 130, phosphorus_kg_ha: 38, potassium_kg_ha: 160 },
    5: { rainfall_mm: 620, temperature_c: 27, humidity_pct: 62, soil_ph: 6.3, nitrogen_kg_ha: 70, phosphorus_kg_ha: 28, potassium_kg_ha: 95 },
  };

  const payload = productMap[productId] || productMap[1];

  try {
    const prediction = await callAiService('/api/crop-recommendation/recommend', payload);
    const rankings = Array.isArray(prediction.rankings) ? prediction.rankings : [];
    const recommendations = [
      `Culture recommandée : ${prediction.recommended_crop || 'maize'} (${toNumber(prediction.confidence, 0)} de score)`,
      ...rankings.slice(0, 3).map((item) => `${item.crop} · ${toNumber(item.score, 0)}`),
    ];

    return res.json({ recommendations, source: 'fastapi-model' });
  } catch (error) {
    const fallbackRecommendations = [
      `Acheter plus de ${productId} si le prix reste sous 90 FCFA/kg`,
      'Vendre si la tendance reste haussière sur 7 jours',
      'Réduire les stocks si les pluies deviennent erratiques',
    ];

    return res.json({ recommendations: fallbackRecommendations, source: 'fallback', warning: error.message });
  }
}

async function askProjectAssistant(req, res) {
  try {
    const question = String(req.body?.question || '').trim();
    if (!question) {
      return res.status(400).json({ error: 'Une question est requise.' });
    }

    const llmApiKey = String(process.env.LLM_API_KEY || '').trim();
    const isLocalOllama = /localhost:11434|127\.0\.0\.1:11434/.test(String(LLM_API_URL || ''));
    if (!llmApiKey && !isLocalOllama) {
      return res.status(503).json({ error: 'Le service LLM n’est pas configuré.' });
    }

    const [productCount, openContracts, totalVolume, recentProducts] = await Promise.all([
      prisma.product.count(),
      prisma.contract.count({ where: { status: { in: ['PENDING', 'PAID'] } } }),
      prisma.product.aggregate({ _sum: { price: true } }),
      prisma.product.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { title: true, price: true, quantity: true } }),
    ]);
    const context = JSON.stringify({ productCount, openContracts, listedOfferValueFcfa: Number(totalVolume._sum?.price || 0), recentProducts });
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (llmApiKey) headers.Authorization = `Bearer ${llmApiKey}`;

    const response = await fetch(`${LLM_API_URL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.2,
        messages: [
          { role: 'system', content: `Tu es l’assistant IA d’AgriConnect. Réponds uniquement aux questions sur l’agriculture et le commerce des produits agricoles : cultures, sols, semences, intrants, irrigation, météo agricole, rendement, récolte, qualité, stockage, transport, prix, achat, vente, contrats et risques. Pour toute question hors de ce domaine, réponds exactement : Je peux uniquement répondre aux questions liées à l’agriculture et au commerce des produits agricoles. Ne fabrique jamais de données. Distingue les faits de la plateforme, les estimations et les conseils généraux. Réponds en français. Données actuelles de la plateforme : ${context}` },
          { role: 'user', content: question },
        ],
      }),
    });
    const responseText = await response.text();
    let data = {};
    try { data = responseText ? JSON.parse(responseText) : {}; } catch { data = {}; }
    if (!response.ok) throw new Error(data?.error?.message || `LLM error (${response.status})`);
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error('Le LLM n’a retourné aucune réponse.');

    return res.json({
      answer,
      source: 'llm',
      model: LLM_MODEL,
    });
  } catch (error) {
    console.error('askProjectAssistant error:', error);
    return res.status(500).json({
      answer: 'Je n’ai pas pu récupérer les données de la plateforme pour répondre avec précision. Vérifiez que la base de données est bien connectée.',
      source: 'error',
      error: error.message,
    });
  }
}

module.exports = {
  getAiHealth,
  getYieldForecast,
  getPriceForecast,
  getRecommendations,
  askProjectAssistant,
};
