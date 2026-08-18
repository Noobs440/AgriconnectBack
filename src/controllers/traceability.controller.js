const entries = [];

function createTraceabilityEntry(req, res) {
  const { qrCode, productId, productName, location, status, note } = req.body || {};
  if (!qrCode) return res.status(400).json({ error: 'qrCode requis' });

  const entry = {
    id: `trace-${Date.now()}`,
    qrCode,
    productId: productId || 'default-product',
    productName: productName || 'Lot local',
    location: location || 'Non renseigné',
    status: status || 'En cours',
    note: note || null,
    createdAt: new Date().toISOString(),
  };

  entries.unshift(entry);
  return res.status(201).json({ entry });
}

function getTraceabilityByQrCode(req, res) {
  const entry = entries.find(item => item.qrCode === req.params.qrCode);
  if (!entry) return res.status(404).json({ error: 'Entrée introuvable' });
  return res.json({ entry });
}

function getTraceabilityHistoryByProduct(req, res) {
  const productId = req.params.productId;
  const history = productId === 'all'
    ? entries
    : entries.filter(item => item.productId === productId);
  return res.json({ history });
}

module.exports = { createTraceabilityEntry, getTraceabilityByQrCode, getTraceabilityHistoryByProduct };