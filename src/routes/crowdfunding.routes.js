const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { listProjects, getProjectById, investInProject, getMyInvestments } = require('../controllers/crowdfunding.controller');
const { createProject } = require('../controllers/crowdfunding.controller');

router.get('/projects', listProjects);
router.get('/projects/:id', getProjectById);
router.post('/projects', authenticate, authorize('FARMER', 'ADMIN'), createProject);
router.post('/invest', authenticate, investInProject);
router.get('/my-investments', authenticate, getMyInvestments);

module.exports = router;
