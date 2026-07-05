require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();

// Middlewares globaux
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
});
app.use(limiter);

// Route de santé (health check)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agriconnect-api-gateway' });
});

// TODO: monter les routes ici au fur et à mesure (Jour 2+)
// app.use('/api/auth', require('./routes/auth.routes'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`API Gateway démarré sur le port ${PORT}`);
});