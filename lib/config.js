import Gilmore from 'gilmore';
import { getKey } from 'keyleth';

// Repo
export const repo = new Gilmore(await getKey('REPO_PATH'));
export const repoName = await repo.githubRepoName();
export const repoSlug = await repo.githubRepoSlug();
