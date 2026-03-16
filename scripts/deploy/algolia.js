import { consoleError } from 'firost';
import indexing from 'algolia-indexing';
import { repoName } from '../../lib/config.js';
import { getIssuesAndPullsRecords } from '../../lib/helpers/record.js';

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

const records = [
  ...(await getIssuesAndPullsRecords()),
  // ...await getCommitRecords(),
];

indexing.verbose();
indexing.config({
  batchMaxSize: 100,
});

await indexing.fullAtomic(credentials, records, settings);
