import { _, pMap } from 'golgoth';
import { consoleError, glob, readJson } from 'firost';
import indexing from 'algolia-indexing';
import { dataOutputCommitsPath, repoName } from '../../lib/config.js';

// Algolia
const algoliaConfig = {
  credentials: {
    appId: process.env.ALGOLIA_APP_ID || 'OKF83BFQS4', // dx-public
    indexName: process.env.ALGOLIA_INDEX_NAME || `commitology_${repoName}`,
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY,
  },
  commitSettings: {
    searchableAttributes: [
      'unordered(subject)',
      'unordered(bodyLine)',
      'author',
    ],
    attributesForFaceting: ['author'],
    attributesToSnippet: ['body'],
    // By default, display chronologically
    customRanking: ['desc(date)'],
  },
};

const { credentials, commitSettings } = algoliaConfig;

// Validate required environment variables
if (!credentials.apiKey) {
  consoleError('Missing ALGOLIA_API_KEY');
  process.exit(1);
}

// Generate all records from output files
const allCommitFiles = await glob('./**/*.json', {
  cwd: dataOutputCommitsPath,
});

// Split into one record per bodyLine
const commitRecords = [];
await pMap(allCommitFiles, async (commitFile) => {
  const commitData = await readJson(commitFile);
  const commonCommitData = {
    hash: commitData.hash,
    author: commitData.author,
    subject: commitData.subject,
    date: commitData.date,
  };

  _.each(commitData.bodyLines, (bodyLine) => {
    commitRecords.push({
      ...commonCommitData,
      bodyLine,
    });
  });
});

indexing.verbose();
indexing.config({
  batchMaxSize: 100,
});

await indexing.fullAtomic(credentials, commitRecords, commitSettings);
