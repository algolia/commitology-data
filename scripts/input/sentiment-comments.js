import { _, pMap } from 'golgoth';
import { absolute, exists, glob, readJson, spinner, writeJson } from 'firost';
import { fieldOrder, getSentiment } from '../../lib/helpers/claude.js';
import { inputDirectory } from '../../lib/helpers/comment.js';

const CONCURRENCY = 10;

const allCommentFiles = await glob('./**/comments.json', {
  cwd: inputDirectory,
});

// Count total comments across all files
let totalComments = 0;
for (const filePath of allCommentFiles) {
  const comments = await readJson(filePath);
  totalComments += comments.length;
}

const progress = spinner();
let processedCount = 0;

await pMap(
  allCommentFiles,
  async (filePath) => {
    const comments = await readJson(filePath);

    await pMap(
      comments,
      async (comment) => {
        const { id, body } = comment;
        const tickTitle = `[${processedCount}/${totalComments}] Comment #${id}`;
        progress.tick(tickTitle);

        // Create sentiment path in same directory as comments.json
        const commentDir = _.replace(filePath, 'comments.json', 'sentiment');
        const sentimentPath = absolute(
          commentDir,
          inputDirectory,
          `${id}.json`,
        );

        if (await exists(sentimentPath)) {
          progress.tick(`${tickTitle} (Already exists, skipping)`);
          processedCount++;
          return;
        }

        // Comments don't have titles, use empty string
        const sentiment = await getSentiment({ title: '', body });

        await writeJson(sentiment, sentimentPath, { sort: fieldOrder });
        processedCount++;
      },
      { concurrency: CONCURRENCY },
    );
  },
  { concurrency: 1 }, // Process files sequentially to avoid rate limiting issues
);

progress.success('All sentiment from comments generated');
