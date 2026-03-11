import { pMap } from 'golgoth';
import { consoleError, glob, readJson } from 'firost';
import indexing from 'algolia-indexing';
import {
  dataOutputCommitsPath,
  dataOutputIssuesPath,
  repoName,
} from '../../lib/config.js';

// Algolia
const algoliaConfig = {
  credentials: {
    appId: process.env.ALGOLIA_APP_ID || 'OKF83BFQS4', // dx-public
    indexName: process.env.ALGOLIA_INDEX_NAME || `commitology_${repoName}`,
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY,
  },
  settings: {
    searchableAttributes: ['unordered(title)', 'unordered(body)', 'user.login'],
    attributesForFaceting: ['user.id'],
    attributesToSnippet: ['body'],
    // By default, display chronologically
    customRanking: ['desc(date)'],
  },
};

const { credentials, settings } = algoliaConfig;

// Validate required environment variables
if (!credentials.apiKey) {
  consoleError('Missing ALGOLIA_API_KEY');
  process.exit(1);
}

// Generate all records from output files
const allCommitFiles = await glob('./**/*.json', {
  cwd: dataOutputCommitsPath,
});
const allIssueFiles = await glob('./**/*.json', {
  cwd: dataOutputIssuesPath,
});

const allRecordFiles = [...allCommitFiles, ...allIssueFiles];
const records = await pMap(allRecordFiles, async (recordFile) => {
  return await readJson(recordFile);
});

indexing.verbose();
indexing.config({
  batchMaxSize: 100,
});

await indexing.fullAtomic(credentials, records, settings);
