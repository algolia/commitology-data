import { absolute, gitRoot } from 'firost';
import Gilmore from 'gilmore';

// Repo
export const repo = new Gilmore('/home/tim/local/www/algolia/instantsearch');
export const repoName = await repo.githubRepoName();
export const repoSlug = await repo.githubRepoSlug();

// Data Input Paths
export const dataInputPath = absolute(gitRoot(), 'data/input');
export const dataInputCommitsPath = absolute(dataInputPath, 'commits');
export const dataInputIssuesPath = absolute(dataInputPath, 'issues');
export const dataInputPullsPath = absolute(dataInputPath, 'pulls');
export const dataInputCommentsPath = absolute(dataInputPath, 'comments');
export const dataInputCommentsIssuesPath = absolute(
  dataInputPath,
  'comments/issues',
);
export const dataInputCommentsPullsPath = absolute(
  dataInputPath,
  'comments/pulls',
);
export const dataInputReviewsPath = absolute(dataInputPath, 'reviews');
export const dataInputAuthorsPath = absolute(dataInputPath, 'authors');

// Input Field Order
export const inputIssueFieldOrder = [
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

// Data Output Paths
export const dataOutputPath = absolute(gitRoot(), 'data/output');
export const dataOutputCommitsPath = absolute(dataOutputPath, 'commits');
export const dataOutputIssuesPath = absolute(dataOutputPath, 'issues');
export const dataOutputPullsPath = absolute(dataOutputPath, 'pulls');

// Output Field Order
export const outputIssueFieldOrder = [
  'number',
  'title',
  'user',
  'body',
  'date',
  'labels',
  'state',
  'reactions',
];
export const outputPullFieldOrder = [];

// Algolia
export const algoliaConfig = {
  credentials: {
    appId: process.env.ALGOLIA_APP_ID || 'OKF83BFQS4', // dx-public
    indexName: process.env.ALGOLIA_INDEX_NAME || `commitology_${repoName}`,
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY,
  },
  settings: {
    searchableAttributes: ['unordered(subject)', 'unordered(body)', 'author'],
    attributesForFaceting: ['author', 'type'],
    attributesToSnippet: ['body:15'],
    // By default, display chronologically
    customRanking: ['desc(date)'],
  },
};
