const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const app = express();
app.use(express.json());
app.use('/api/ai', require('../src/routes/ai.routes'));

async function call(path, init = {}) {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, init);
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('AI health route responds with backend gateway info', async () => {
  const response = await call('/api/ai/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.service, 'agriconnect-ai-gateway');
});

test('AI assistant answers using project data', async () => {
  const response = await call('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Combien de produits sont disponibles ?' }),
  });

  assert.equal(response.status, 200);
  assert.match(String(response.body.answer || ''), /produit|produits|plateforme/i);
});
