const { WebSocketServer } = require('ws');

const clients = new Set();

function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/market/price-update' });

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  return wss;
}

function broadcastPriceUpdate(productId, newPrice) {
  const payload = JSON.stringify({
    type: 'PRICE_UPDATE',
    productId,
    price: newPrice,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

module.exports = { initWebSocket, broadcastPriceUpdate };