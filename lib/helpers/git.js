import { _ } from 'golgoth';
import { repo } from '../config.js';

/**
 * Retrieves a formatted list of git commits with date, hash, and subject information.
 * @returns {Promise<Array<{datePath: string, hash: string, subject: string}>>} Array of commit objects containing formatted date path, commit hash, and commit subject
 */
export async function getCommitList() {
  // Pull latest changes before listing commits
  await repo.run('pull');

  const result = await repo.run(
    'log --date=format:%Y/%m --pretty=format:"%cd▮%h▮%s"',
  );
  return _.chain(result)
    .split('\n')
    .map((line) => {
      const [datePath, hash, subject] = _.split(line, '▮');
      return { datePath, hash, subject };
    })
    .value();
}

/**
 * Retrieves commit data for a specific commit hash from the repository
 * @param {string} commitHash - The commit hash to retrieve data for
 * @returns {Promise<{hash: string, longHash: string, subject: string, date: number, author: string, body: string, changedFilesCount: number, addedLinesCount: number, deletedLinesCount: number}>} Object containing the commit's metadata and stats
 */
export async function getCommitData(commitHash) {
  const result = await repo.run(
    `show ${commitHash} --format="%h▮%H▮%s▮%at▮%an▮%b%n━━━STATS━━━" --shortstat`,
  );

  // Split by the marker to separate commit info from stats
  const [commitPart, statsPart] = result.split('━━━STATS━━━');

  // Parse commit info
  const [hash, longHash, subject, date, author, ...bodyParts] =
    commitPart.split('▮');
  const body = bodyParts.join('▮').trim(); // Rejoin in case body contains ▮

  // Parse shortstat
  const stats = parseShortstat(statsPart);

  return {
    hash,
    longHash,
    subject,
    date: _.parseInt(date),
    author,
    body,
    changedFilesCount: stats.changedFilesCount,
    addedLinesCount: stats.addedLinesCount,
    deletedLinesCount: stats.deletedLinesCount,
  };
}

/**
 * Parses git shortstat output to extract file and line change statistics
 * @param {string} shortstatOutput - The output from git --shortstat
 * @returns {{changedFilesCount: number, addedLinesCount: number, deletedLinesCount: number}} Object containing file and line change counts
 */
function parseShortstat(shortstatOutput) {
  if (!shortstatOutput || !shortstatOutput.trim()) {
    return { changedFilesCount: 0, addedLinesCount: 0, deletedLinesCount: 0 };
  }

  const shortstatLine = shortstatOutput
    .trim()
    .split('\n')
    .find((line) => line.includes('file') && line.includes('changed'));

  if (!shortstatLine) {
    return { changedFilesCount: 0, addedLinesCount: 0, deletedLinesCount: 0 };
  }

  const match = shortstatLine.match(
    /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/,
  );

  if (!match) {
    return { changedFilesCount: 0, addedLinesCount: 0, deletedLinesCount: 0 };
  }

  return {
    changedFilesCount: parseInt(match[1]),
    addedLinesCount: match[2] ? parseInt(match[2]) : 0,
    deletedLinesCount: match[3] ? parseInt(match[3]) : 0,
  };
}
