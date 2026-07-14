const axios = require('axios');

let cachedToken = null;
let tokenExpiresAt = null;

function getErrorMessage(err) {
  if (err?.response?.data) {
    if (typeof err.response.data === 'string') return err.response.data;
    return err.response.data.message || err.response.data.error || JSON.stringify(err.response.data);
  }
  return err?.message || 'Erreur CamPay';
}

async function getToken() {
  const baseUrl = process.env.CAMPAY_BASE_URL;
  const username = process.env.CAMPAY_USERNAME;
  const password = process.env.CAMPAY_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error('Variables d\'environnement CamPay incomplètes');
  }

  const now = Date.now();
  if (cachedToken && tokenExpiresAt && tokenExpiresAt - 60000 > now) {
    return cachedToken;
  }

  try {
    const response = await axios.post(
      `${baseUrl}/token/`,
      { username, password },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = response.data || {};
    const token = data.token || data.access_token || data.accessToken || data.jwt || data.auth_token;
    const expiresIn = data.expires_in ?? data.expiresIn ?? data.expires ?? data.expiry ?? data.ttl;

    if (!token) {
      throw new Error('Réponse CamPay sans token d\'authentification');
    }

    const seconds = Number(expiresIn);
    const safeExpiresIn = Number.isFinite(seconds) && seconds > 0 ? seconds : 3600;

    cachedToken = token;
    tokenExpiresAt = Date.now() + safeExpiresIn * 1000;

    return token;
  } catch (err) {
    const message = getErrorMessage(err);
    const error = new Error(`Échec d'authentification CamPay: ${message}`);
    error.original = err;
    throw error;
  }
}

async function initiateCollect({ amount, phoneNumber, description, externalReference }) {
  const url = `${process.env.CAMPAY_BASE_URL}/collect/`;
  const payload = {
    amount: String(amount),
    currency: 'XAF',
    from: phoneNumber,
    description,
    external_reference: externalReference,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const token = await getToken();
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (err) {
      const status = err?.response?.status;
      const shouldRetry = (status === 401 || status === 403) && attempt === 0;
      if (shouldRetry) {
        cachedToken = null;
        tokenExpiresAt = null;
        continue;
      }

      const message = getErrorMessage(err);
      const error = new Error(`Échec de l'appel CamPay collect: ${message}`);
      error.original = err;
      throw error;
    }
  }
}

module.exports = { initiateCollect };