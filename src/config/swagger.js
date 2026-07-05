const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgriConnect API',
      version: '0.1.0',
      description: 'Documentation de l\'API AgriConnect Ouest',
    },
    servers: [{ url: 'http://localhost:8000/api' }],
  },
  apis: ['./src/routes/*.js'], // Swagger lira les commentaires JSDoc dans tes fichiers de routes
};

module.exports = swaggerJsdoc(options);