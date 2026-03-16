import { _ } from 'golgoth';
import { spinner, writeJson } from 'firost';
import {
  forEachRepoAuthor,
  getGitHubUserFromAuthorName,
  getInputAuthors,
  inputPath,
} from '../../lib/helpers/author.js';

/**
 * Read all authors from the local git repo history.
 * For each, find one of their commits, and ask GitHub for info about that
 * commit.
 * If a user is associated, save the user id in the authors.json file
 **/
const knownAuthors = await getInputAuthors();
const hashedIds = {};
_.each(knownAuthors, ({ name, id }) => {
  hashedIds[name] = id;
});

const progress = spinner();

const authors = await forEachRepoAuthor(
  async (author) => {
    const { index, max, data } = author;
    const { name } = data;
    progress.tick(`[${index}/${max}] ${name}`);

    // We avoid doing an API call if we have already resolved the name <=> id of
    // that author
    if (_.has(hashedIds, name)) {
      data.id = hashedIds[name];
    } else {
      const user = await getGitHubUserFromAuthorName(name);
      data.id = user?.id || -1;
    }

    return data;
  },
  { concurrency: 50 },
);

const sortedAuthors = _.sortBy(authors, 'id');
await writeJson(sortedAuthors, inputPath);

progress.success('All authors saved');
