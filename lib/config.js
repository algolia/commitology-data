import { absolute, gitRoot } from 'firost';
import Gilmore from 'gilmore';

export const repo = new Gilmore('/home/tim/local/www/algolia/instantsearch');
export const repoName = await repo.githubRepoName();
export const repoSlug = await repo.githubRepoSlug();

export const dataInputCommitsPath = absolute(gitRoot(), 'data/input/commits');
export const commitFieldOrder = [
  'hash',
  'author',
  'subject',
  'body',
  'date',
  'longHash',
];

export const dataInputIssuesPath = absolute(gitRoot(), 'data/input/issues');
export const issueFieldOrder = [
  'number',
  'html_url',
  'title',
  'body',
  'created_at',
  'state',
  'comments',
  'reactions',
  'labels',
  'user',
];

export const algoliaConfig = {
  credentials: {
    appId: process.env.ALGOLIA_APP_ID || 'OKF83BFQS4', // dx-public
    indexName: process.env.ALGOLIA_INDEX_NAME || `commitology_${repoName}`,
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY,
  },
  settings: {
    searchableAttributes: ['unordered(subject)', 'unordered(body)', 'author'],
    attributesForFaceting: ['author'],
    attributesToSnippet: ['body:15'],
    // By default, display chronologically
    customRanking: ['desc(desc)'],
  },
};
