import { pMap } from 'golgoth';
import { consoleError, glob, readJson } from 'firost';
import indexing from 'algolia-indexing';
import { algoliaConfig, dataInputCommitsPath } from '../../lib/config.js';

const { credentials, settings } = algoliaConfig;

// Validate required environment variables
if (!credentials.apiKey) {
  consoleError('Missing ALGOLIA_API_KEY');
  process.exit(1);
}

// Generate all records from output files
const allCommitFiles = await glob('./**/*.json', { cwd: dataInputCommitsPath });
const records = await pMap(allCommitFiles, readJson);

indexing.verbose();
indexing.config({
  batchMaxSize: 100,
});

await indexing.fullAtomic(credentials, records, settings);
