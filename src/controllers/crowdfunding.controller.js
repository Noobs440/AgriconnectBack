const projects = [];
const investments = [];

function listProjects(req, res) {
  return res.json({ projects });
}

function getProjectById(req, res) {
  const project = projects.find(item => item.id === req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }
  return res.json({ project });
}

function createProject(req, res) {
  const { title, description, goal, deadline, category, location, image } = req.body || {};
  const goalNumber = Number(goal);
  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ message: 'Le titre et la description sont requis.' });
  }
  if (!Number.isFinite(goalNumber) || goalNumber <= 0) {
    return res.status(400).json({ message: 'L’objectif doit être un montant positif.' });
  }
  if (typeof image !== 'string' || !image.trim()) {
    return res.status(400).json({ message: 'Une image de couverture est obligatoire.' });
  }
  if (deadline && Number.isNaN(Date.parse(deadline))) {
    return res.status(400).json({ message: 'La date limite est invalide.' });
  }

  const project = {
    id: `project-${Date.now()}`,
    title: title.trim(),
    description: description.trim(),
    goal: goalNumber,
    raised: 0,
    owner: req.user.id,
    deadline: deadline || null,
    category: category || 'Projet agricole',
    location: location || null,
    image: image.trim(),
    status: 'En cours',
    investorsCount: 0,
  };
  projects.unshift(project);
  return res.status(201).json({ project });
}

function investInProject(req, res) {
  const { projectId, amount } = req.body || {};
  const amountNumber = Number(amount);
  const project = projects.find(item => item.id === projectId);
  if (!project) return res.status(404).json({ message: 'Projet introuvable.' });
  if (project.owner === req.user.id) {
    return res.status(403).json({ message: 'Le créateur ne peut pas investir dans son propre projet.' });
  }
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return res.status(400).json({ message: 'Le montant doit être positif.' });
  }

  investments.push({ id: `investment-${Date.now()}`, projectId, investorId: req.user.id, amount: amountNumber });
  project.raised += amountNumber;
  project.investorsCount += 1;
  return res.json({ success: true, invested: amountNumber, projectId });
}

function getMyInvestments(req, res) {
  return res.json({ investments: investments.filter(item => item.investorId === req.user.id) });
}

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  investInProject,
  getMyInvestments,
};
