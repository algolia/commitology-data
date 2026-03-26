import { consoleError, consoleInfo } from 'firost';
import indexing from 'algolia-indexing';
import { getKey } from 'keyleth';
import { getRecords } from '../../lib/helpers/record.js';

// Algolia
const algoliaConfig = {
  credentials: {
    appId: await getKey('ALGOLIA_APP_ID', 'OKF83BFQS4'), // dx-public
    indexName: await getKey('ALGOLIA_INDEX_NAME', 'commitology_instantsearch'),
    apiKey: await getKey('ALGOLIA_ADMIN_API_KEY'),
  },
  settings: {
    searchableAttributes: ['unordered(title)', 'unordered(body)', 'user.login'],
    attributesToSnippet: ['body'],

    attributesForFaceting: [
      'type',
      // Date
      'date.timestamp',
      'date.year',
      'date.month',
      'date.day',
      'date.hour',
      'date.minute',
      'date.second',
      // User
      'searchable(user.facet)',
      'user.login',
      'user.isBot',
      'user.isOrganization',
      // Sentiment
      'sentiment.score',
      'sentiment.primary',
      'sentiment.emotions',
      // Diff
      'diff.addedLines',
      'diff.changedFiles',
      'diff.deletedLines',
      // Commit
      'commit.state',
      // Issue
      'issue.state',
      // Pull
      'pull.state',
      'pull.label.name',
      // Comments
    ],

    // By default, display chronologically (newest first), then by sentiment score
    customRanking: ['desc(date.timestamp)', 'desc(sentiment.score)'],

    // Replicas for alternative sorting
    replicas: {
      // Oldest to newest
      oldest: {
        customRanking: ['asc(date.timestamp)', 'desc(sentiment.score)'],
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
        customRanking: ['desc(diff.changedFiles)'],
      },
      // Most lines deleted
      most_lines_deleted: {
        customRanking: ['desc(diff.deletedLines)'],
      },
      // Most positive sentiment first
      most_positive: {
        customRanking: ['desc(sentiment.score)'],
      },
      // Most negative sentiment first
      most_negative: {
        customRanking: ['asc(sentiment.score)'],
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
