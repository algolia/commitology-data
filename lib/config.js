import Gilmore from 'gilmore';

// Repo
export const repo = new Gilmore('/home/tim/local/www/algolia/instantsearch');
export const repoName = await repo.githubRepoName();
export const repoSlug = await repo.githubRepoSlug();
