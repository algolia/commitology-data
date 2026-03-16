import { _, pMap } from 'golgoth';
import { absolute, exists, readJson, spinner, writeJson } from 'firost';
import { repo } from '../../lib/config.js';
import { inputDirectory } from '../../lib/helpers/author.js';
import { getAuthorList } from '../../lib/helpers/git.js';
import { getCommit } from '../../lib/helpers/github.js';

const CONCURRENCY = 5;
const authorList = await getAuthorList();
const authorMaxCount = authorList.length;
const progress = spinner();

await pMap(
  authorList,
  async (gitAuthor, authorIndex) => {
    const { name, email } = gitAuthor;
    const tickTitle = `[${authorIndex}/${authorMaxCount}] ${name}`;
    progress.tick(tickTitle);

    // Find a commit from that author locally
    const escapedName = _.chain(name)
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .value();
    const firstCommitHash = await repo.run(
      `log --author="${escapedName}" --format="%H" -1`,
    );

    // Get the github author of that commit
    const commitData = await getCommit(firstCommitHash);
    const githubAuthor = commitData.author || {};
    const githubLogin = githubAuthor?.login || '__UNKNOWN_GITHUB_PROFILE__';

    // Create or update the user json file
    const authorPath = absolute(inputDirectory, `${githubLogin}.json`);

    let authorContent = {
      github: githubAuthor,
      aliases: {
        names: [name],
        emails: [email],
      },
    };
    if (await exists(authorPath)) {
      authorContent = await readJson(authorPath);
      authorContent.aliases.names = _.chain(authorContent)
        .get('aliases.names')
        .concat(name)
        .uniq()
        .sort()
        .value();
      authorContent.aliases.emails = _.chain(authorContent)
        .get('aliases.emails')
        .concat(email)
        .uniq()
        .sort()
        .value();
    }

    // Save the file
    await writeJson(authorContent, authorPath);
  },
  { concurrency: CONCURRENCY },
);
progress.success('All authors imported');
