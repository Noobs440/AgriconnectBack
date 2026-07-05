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

## Structure du projet
src/
  config/       → connexions DB, Redis
  routes/       → endpoints API
  controllers/  → logique métier
  middlewares/  → auth, erreurs, RBAC
  services/     → email, paiement, etc.

## Documentation API
Swagger disponible sur `/api-docs` une fois le serveur lancé.