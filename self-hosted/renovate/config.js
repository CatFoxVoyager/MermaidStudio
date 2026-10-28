// Config Renovate self-hosted — la config par-repo vit dans renovate.json (racine).
module.exports = {
  platform: 'github',
  endpoint: 'https://api.github.com/',
  token: process.env.RENOVATE_TOKEN,
  repositories: ['CatFoxVoyager/MermaidStudio'],
  onboarding: false,          // la config du dépôt est committée
  requireConfig: 'optional',
  prCreation: 'immediate',
  persistRepoData: true,      // cache du clone dans le volume renovate-cache
  logLevel: process.env.LOG_LEVEL || 'info',
  // Commits attribués au propriétaire (PAT de son compte — décision design §6).
  // Récupérer l'ID numérique via GET /users/CatFoxVoyager, puis décommenter :
  // gitAuthor: 'CatFoxVoyager <ID+CatFoxVoyager@users.noreply.github.com>',
};
