function detectOperator(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') return 'UNKNOWN';

  let cleaned = phoneNumber.replace(/\s|-/g, '');
  if (cleaned.startsWith('+237')) cleaned = cleaned.slice(4);
  if (cleaned.startsWith('237')) cleaned = cleaned.slice(3);

  if (cleaned.length !== 9 || !/^\d{9}$/.test(cleaned)) {
    return 'UNKNOWN';
  }

  const prefix3 = cleaned.slice(0, 3);
  const prefix2 = cleaned.slice(0, 2);

  if (['686', '687', '688', '689'].includes(prefix3)) {
    return 'ORANGE';
  }
  if (['650', '651', '652', '653', '654'].includes(prefix3)) {
    return 'MTN';
  }
  if (['655', '656', '657', '658', '659'].includes(prefix3)) {
    return 'ORANGE';
  }

  if (prefix2 === '67' || prefix2 === '68') {
    return 'MTN';
  }
  if (prefix2 === '69') {
    return 'ORANGE';
  }

  return 'UNKNOWN';
}

module.exports = { detectOperator };