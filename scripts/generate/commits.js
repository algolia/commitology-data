import { _, pMap } from 'golgoth';
import { absolute, glob, readJson, writeJson } from 'firost';
import {
  dataInputCommitsPath,
  dataOutputCommitsPath,
  outputCommitFieldOrder,
} from '../../lib/config.js';
import { datePath } from '../../lib/helper.js';

const rawCommitPaths = await glob('./**/*.json', { cwd: dataInputCommitsPath });

await pMap(_.slice(rawCommitPaths, -1), async (rawCommitPath) => {
  const rawCommitData = await readJson(rawCommitPath);
  const { author, subject, hash, body, date } = rawCommitData;

  const shortHash = hash.substring(0, 7);
  const bodyLines = _.split(body, '\n');

  const commitData = {
    hash: shortHash,
    author,
    subject,
    bodyLines,
    date,
  };

  const commitPath = absolute(
    dataOutputCommitsPath,
    datePath(date),
    `${shortHash}.json`,
  );

  await writeJson(commitData, commitPath, {
    sort: outputCommitFieldOrder,
  });
});
