import path from 'node:path';
import {
  absolute,
  exists,
  gitRoot,
  glob,
  readJson,
  spinner,
  writeJson,
} from 'firost';
import { analyzeSentiment } from '../../lib/helpers/claude.js';

const inputDirectory = absolute(gitRoot(), 'data/input/issues');
const progress = spinner();

// Statistics
const stats = {
  processed: 0,
  skipped: 0,
  errors: 0,
  sentiments: {
    positive: 0,
    negative: 0,
    neutral: 0,
  },
};

/**
 * Process a single issue
 * @param root0
 * @param root0.filepath
 * @param root0.data
 * @param root0.index
 * @param root0.max
 */
async function processIssue({ filepath, data, index, max }) {
  const issueNumber = data.number;
  progress.tick(`[${index + 1}/${max}] Issue #${issueNumber}: ${data.title}`);

  try {
    const issueDir = path.dirname(filepath);
    const sentimentFilePath = path.join(issueDir, 'sentiment.json');

    // Skip if sentiment.json already exists
    if (await exists(sentimentFilePath)) {
      stats.skipped++;
      return;
    }

    // Analyze sentiment
    const sentiment = await analyzeSentiment(data.title, data.body);

    // Write sentiment.json
    await writeJson(sentiment, sentimentFilePath);

    // Update statistics
    stats.processed++;
    stats.sentiments[sentiment.primary]++;
  } catch (error) {
    stats.errors++;
    progress.error(`Error processing issue #${issueNumber}: ${error.message}`);
  }
}

/**
 * Main execution
 */
const issueFiles = await glob('./**/*/issue.json', { cwd: inputDirectory });
const max = issueFiles.length;

if (max === 0) {
  progress.error('No issues found. Make sure the restructuring is complete.');
  process.exit(1);
}

// Process all issues sequentially (rate limiting built into analyzeSentiment)
for (let index = 0; index < issueFiles.length; index++) {
  const filepath = issueFiles[index];
  const data = await readJson(filepath);
  await processIssue({ filepath, data, index, max });
}

// Print final statistics
const total = stats.processed + stats.skipped + stats.errors;
progress.success(
  `Sentiment analysis complete! Processed ${stats.processed}/${total} issues`,
);

console.log('\n📊 Statistics:');
console.log(`  Skipped:        ${stats.skipped} (already had sentiment.json)`);
console.log(`  Errors:         ${stats.errors}`);

if (stats.processed > 0) {
  console.log('\nSentiment Distribution:');
  console.log(
    `  Positive:       ${stats.sentiments.positive} (${((stats.sentiments.positive / stats.processed) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  Negative:       ${stats.sentiments.negative} (${((stats.sentiments.negative / stats.processed) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  Neutral:        ${stats.sentiments.neutral} (${((stats.sentiments.neutral / stats.processed) * 100).toFixed(1)}%)`,
  );
}
