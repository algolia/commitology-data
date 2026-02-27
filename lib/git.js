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
