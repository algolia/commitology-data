import { _, pMap } from 'golgoth';
import { spinner } from 'firost';
import { dataInputAuthorsPath, repo } from '../../lib/config.js';
import { getAuthorList } from '../../lib/git.js';

const CONCURRENCY = 10;
const authorList = await getAuthorList();
const authorMaxCount = authorList.length;
const progress = spinner();

await pMap(
  authorList,
  async (author, authorIndex) => {
    const { name } = author;
    const tickTitle = `[${authorIndex}/${authorMaxCount}] ${name}`;
    progress.tick(tickTitle);

    const escapedName = _.chain(name)
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .value();
    const firstCommitHash = await repo.run(
      `log --author="${escapedName}" --format="%H" -1`,
    );
    console.log(firstCommitHash, dataInputAuthorsPath);
  },
  { concurrency: CONCURRENCY },
);
progress.success('All authors imported');
