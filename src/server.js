require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { initWebSocket } = require('./services/websocket.service');

const app = express();
const server = http.createServer(app);

// Middlewares globaux
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
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
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`API Gateway démarré sur le port ${PORT}`);
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/market', require('./routes/market.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/crowdfunding', require('./routes/crowdfunding.routes'));
app.use('/api/contracts', require('./routes/contract.routes'));
app.use('/api/traceability', require('./routes/traceability.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/analytics', require('./routes/analytics.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/notifications', require('./routes/notification.routes'));
app.use('/contracts', require('./routes/contract.routes'));
app.use('/traceability', require('./routes/traceability.routes'));
app.use('/chat', require('./routes/chat.routes'));
app.use('/api/chat', require('./routes/chat.routes'));