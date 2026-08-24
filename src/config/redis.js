const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL?.trim();

function unavailable() {
	throw new Error('REDIS_URL est obligatoire pour cette fonctionnalité');
}

const redis = redisUrl
	? new Redis(redisUrl)
	: {
			set: unavailable,
			get: unavailable,
			del: unavailable,
		};

if (redisUrl) {
	redis.on('error', (error) => {
		console.error('Connexion Redis indisponible:', error.message);
	});
}

module.exports = redis;