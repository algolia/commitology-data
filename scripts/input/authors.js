import { _ } from 'golgoth';
import { spinner, writeJson } from 'firost';
import { forEachRepoAuthor, inputPath } from '../../lib/helpers/author.js';

const progress = spinner();

const authors = await forEachRepoAuthor(
  async (author) => {
    const { index, max, data } = author;
    progress.tick(`[${index}/${max}] ${data.name}`);
    return data;
  },
  { concurrency: 50 },
);

const sortedAuthors = _.sortBy(authors, ['name', 'email']);
await writeJson(sortedAuthors, inputPath);

progress.success('All authors saved');
