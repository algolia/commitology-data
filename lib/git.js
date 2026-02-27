import { _ } from 'golgoth';
import { repo } from './config.js';

/**
 * Retrieves a formatted list of git commits with date, hash, and subject information.
 * @returns {Promise<Array<{datePath: string, hash: string, subject: string}>>} Array of commit objects containing formatted date path, commit hash, and commit subject
 */
export async function getCommitList() {
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
 * @returns {Promise<{datePath: string, hash: string, subject: string}>} Object containing the commit's date path, hash, and subject
 */
export async function getCommitData(commitHash) {
  const result = await repo.run(
    `show ${commitHash} --no-patch --pretty=format:"%h▮%H▮%s▮%at▮%an▮%b"`,
  );
  const [hash, longHash, subject, date, author, body] = _.split(result, '▮');
  return { hash, longHash, subject, date: _.parseInt(date), author, body };
}
