function getFarmerAnalytics(req, res) {
  return res.json({
    revenue30d: 1850000,
    revenueDelta: 12.4,
    volumeSold: 240,
    volumeDelta: 8.1,
    activeContracts: 6,
    rating: '4.8/5',
  });
}

function getBuyerAnalytics(req, res) {
  return res.json({
    spend30d: 980000,
    spendDelta: 5.3,
    ordersCount: 14,
    activeSuppliers: 6,
    savings: '180k FCFA',
  });
}

function getAdminAnalytics(req, res) {
  return res.json({
    usersCount: 32,
    productsCount: 18,
    transactionsCount: 24,
    revenueSeries: [5, 8, 6, 9, 12, 10, 11],
  });
}

module.exports = { getFarmerAnalytics, getBuyerAnalytics, getAdminAnalytics };