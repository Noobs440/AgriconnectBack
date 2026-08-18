# AgriConnect Backend

## Prérequis
- Node.js 18+
- Docker & Docker Compose

## Installation
\`\`\`bash
npm install
cp .env.example .env   # puis renseigner les valeurs
docker compose up -d
npx prisma migrate dev
npm run dev
\`\`\`

## Variables d'environnement
| Variable | Description |
|---|---|
| PORT | Port de l'API Gateway (8000) |
| DATABASE_URL | Connexion PostgreSQL |
| REDIS_URL | Connexion Redis |
| MARKET_EXTERNAL_API_URL | URL de la source JSON externe des cotations |
| MARKET_EXTERNAL_API_KEY | Clé facultative envoyée en Bearer à la source externe |
| MARKET_EXTERNAL_TIMEOUT_MS | Délai maximal de réponse de la source externe |

La route `GET /api/market/prices` utilise la source externe lorsqu'elle est configurée. Elle accepte un tableau JSON ou un objet contenant `prices`, `data` ou `results`. Chaque élément doit fournir un nom (`productTitle`, `product_name`, `commodity`, `name` ou `title`) et un prix (`currentPrice`, `current_price`, `price` ou `value`). En cas d'indisponibilité, l'API signale explicitement `meta.source = database-fallback`.

## Structure du projet
src/
  config/       → connexions DB, Redis
  routes/       → endpoints API
  controllers/  → logique métier
  middlewares/  → auth, erreurs, RBAC
  services/     → email, paiement, etc.

## Documentation API
Swagger disponible sur `/api-docs` une fois le serveur lancé.