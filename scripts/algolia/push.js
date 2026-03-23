import { consoleError, consoleInfo } from 'firost';
import indexing from 'algolia-indexing';
import { repoName } from '../../lib/config.js';
import { getRecords } from '../../lib/helpers/record.js';

// Algolia
const algoliaConfig = {
  credentials: {
    appId: process.env.ALGOLIA_APP_ID || 'OKF83BFQS4', // dx-public
    indexName: process.env.ALGOLIA_INDEX_NAME || `commitology_${repoName}`,
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY,
  },
  settings: {
    searchableAttributes: ['unordered(title)', 'unordered(body)', 'user.login'],
    attributesToSnippet: ['body'],

    attributesForFaceting: [
      'type',
      'date',
      'searchable(user.facet)', // For the User filter widget
      'user.login', // Actual facetting
      'commit.state',
      'issue.state',
      'pull.state',
      'pull.label.name',
    ],

    // By default, display chronologically (newest first)
    customRanking: ['desc(date)'],

    // Replicas for alternative sorting
    replicas: {
      // Oldest to newest
      oldest: {
        customRanking: ['asc(date)'],
      },
      // Most comments first
      most_commented: {
        customRanking: ['desc(commentCount)'],
      },
      // Most reactions first
      most_reacted: {
        customRanking: ['desc(reactionCount)'],
      },
      // Most files changed
      most_files_changed: {
        customRanking: ['desc(pull.changedFilesCount)'],
      },
      // Most lines deleted
      most_lines_deleted: {
        customRanking: ['desc(pull.deletedLinesCount)'],
      },
    },
  },
};

const { credentials, settings } = algoliaConfig;

// Validate required environment variables
if (!credentials.apiKey) {
  consoleError('Missing ALGOLIA_API_KEY');
  process.exit(1);
}

consoleInfo('Getting all records...');
const records = await getRecords();

indexing.verbose();
indexing.config({
  batchMaxSize: 100,
});

await indexing.fullAtomic(credentials, records, settings);
