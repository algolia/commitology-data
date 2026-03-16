import { pMap } from 'golgoth';
import { consoleError, glob, readJson } from 'firost';
import indexing from 'algolia-indexing';
import { dataOutputPath, repoName } from '../../lib/config.js';

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
const recordPaths = await glob('./**/*.json', {
  // const recordPaths = await glob('./issues/**/5263.json', {
  cwd: dataOutputPath,
});

const records = [];
await pMap(recordPaths, async (recordPath) => {
  const output = await readJson(recordPath);
  records.push(output);
  // console.log(output);
});

indexing.verbose();
indexing.config({
  batchMaxSize: 100,
});

await indexing.fullAtomic(credentials, records, settings);
