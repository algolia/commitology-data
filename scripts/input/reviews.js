import { dayjs, pMap } from 'golgoth';
import {
  absolute,
  exists,
  glob,
  readJson,
  sleep,
  spinner,
  writeJson,
} from 'firost';
import { getReviews } from '../../lib/helpers/github.js';
import { inputDirectory as pullsInputDirectory } from '../../lib/helpers/pull.js';
import { inputDirectory as reviewInputDirectory } from '../../lib/helpers/review.js';

const CONCURRENCY = 10;

const allPulls = await glob('./**/*.json', { cwd: pullsInputDirectory });
const maxPullCount = allPulls.length;
const progress = spinner();

await pMap(
  allPulls,
  async (pullPath, pullIndex) => {
    const pullContent = await readJson(pullPath);
    const { number, title, created_at } = pullContent;
    const tickTitle = `[${pullIndex}/${maxPullCount}] ${title}`;
    progress.tick(tickTitle);

    const pullDatePath = dayjs(created_at).format('YYYY/MM');
    const reviewsPath = absolute(
      reviewInputDirectory,
      pullDatePath,
      `${number}.json`,
    );

    if (await exists(reviewsPath)) {
      progress.tick(`${tickTitle} (Already exists, skipping)`);
      return;
    }

    const reviewsContent = await getReviews(number);

    await writeJson(reviewsContent, reviewsPath);
    progress.tick(`${tickTitle} (Throttling for rate limit...)`);
    await sleep(1000);
  },
  { concurrency: CONCURRENCY },
);
progress.success('All reviews from pull requests fetched');
