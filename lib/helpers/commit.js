import { _, pMap } from 'golgoth';
import { absolute, gitRoot, glob, readJson } from 'firost';
import { datePath } from '../../lib/helper.js';

export let __;

export const inputDirectory = absolute(gitRoot(), 'data/input/commits');
export const outputDirectory = absolute(gitRoot(), 'data/output/commits');

export const fieldOrder = {
  input: [
    'hash',
    'author',
    'subject',
    'body',
    'date',
    'longHash',
    'changedFilesCount',
    'addedLinesCount',
    'deletedLinesCount',
  ],
  output: ['type', 'title', 'date', 'body', 'author', 'commit'],
};

/**
 * Iterates over all input commit JSON files and executes a callback function for each one.
 * @param {Function} callback - The callback function to execute for each input commit
 * @param {object} options - Options object passed to pMap for controlling concurrency
 * @returns {Promise<Array>} A promise that resolves to an array of callback results
 */
export async function forEachInputCommit(callback, options) {
  const filepaths = await glob('./**/commit.json', { cwd: inputDirectory });
  const max = filepaths.length;

  return await pMap(
    filepaths,
    async (filepath, index) => {
      const data = await readJson(filepath);
      return await callback({ filepath, data, index, max });
    },
    options,
  );
}

/**
 * Normalizes a commit object to a standardized format with shortened hash and consistent property names.
 * @param {object} inputCommit - The raw commit object to normalize
 * @param {string} inputCommit.hash - The full commit hash
 * @param {string} inputCommit.subject - The commit subject/message
 * @param {string} inputCommit.author - The commit author
 * @param {string} inputCommit.body - The commit body/description
 * @param {string|Date} inputCommit.date - The commit date
 * @returns {Promise<object>} A normalized commit object with type, hash (7 chars), title, author, body, and date
 */
export async function normalizeCommit(inputCommit) {
  const { author, body, date } = inputCommit;

  const hash = inputCommit.hash.substring(0, 7);
  const title = inputCommit.subject;
  const state = __.normalizeState(inputCommit);

  return {
    // Common keys
    type: 'commit',
    title,
    date,
    body,
    // Author
    author,
    // Commit
    commit: {
      state,
      hash,
    },
  };
}

/**
 * Generates the absolute file path for a commit's output JSON file
 * @param {object} commit - The commit object containing date and hash information
 * @param {string|Date} commit.date - The commit date
 * @param {string} commit.hash - The commit hash
 * @returns {string} The absolute path to the commit's JSON output file
 */
export function getOutputPath(commit) {
  return absolute(
    outputDirectory,
    datePath(commit.date),
    `${commit.commit.hash}.json`,
  );
}

__ = {
  normalizeState: (inputCommit) => {
    const knownStates = [
      'chore',
      'ci',
      'docs',
      'feat',
      'fix',
      'perf',
      'refactor',
      'release',
      'revert',
      'style',
      'test',
    ];
    const subject = inputCommit.subject.toLowerCase();
    return _.chain(subject)
      .split(' ')
      .first()
      .replace('*', '')
      .replace(':', '')
      .trim()
      .thru((item) => {
        const type = _.chain(item).split('(').first().value();
        if (_.includes(knownStates, type)) {
          // Hijack release commits
          if (type == 'chore' && _.includes(subject, 'release')) {
            return 'release';
          }
          return type;
        }
        return __.guessUnknownTypes(subject);
      })
      .value();
  },
  /**
   * Guesses the commit type based on the commit subject by checking for keywords
   * @param {string} subject - The commit subject/message to analyze
   * @returns {string} The guessed commit type (release, merge, docs, chore, test, ci, revert, style, refactor, fix, or feat)
   */
  guessUnknownTypes(subject) {
    if (__.isReleaseCommit(subject)) {
      return 'release';
    }

    const items = [
      {
        type: 'merge',
        keywords: [
          'merge branch',
          'merge pull request',
          'merge remote-tracking branch',
        ],
      },
      {
        type: 'docs',
        keywords: [
          'docs',
          'documentation',
          'doc',
          'example',
          'readme',
          'rephrase',
          'sample',
          'typo',
        ],
      },
      { type: 'revert', keywords: ['revert'] },
      {
        type: 'chore',
        keywords: [
          'babel',
          'build',
          'bump',
          'cached',
          'changelog',
          'chore',
          'chore/ts',
          'commit',
          'console.log',
          'dependencies',
          'dependency',
          'dep',
          'dev comments',
          'git ignore',
          'package',
          'package.json',
          'peer dep',
          'unused import',
          'update',
          'upgrade',
          'wip',
          '[chore]',
        ],
      },
      { type: 'test', keywords: ['mock', 'spy', 'test', 'jest'] },
      { type: 'ci', keywords: ['ci', 'circleci', 'travis'] },
      {
        type: 'style',
        keywords: [
          'background-color',
          'bem',
          'code review',
          'convention',
          'css',
          'eslint',
          'font-size',
          'lint',
          'nits',
          'nit',
          'responsive',
          'review',
          'style',
          'suggestions',
        ],
      },
      {
        type: 'refactor',
        keywords: [
          'consistency',
          'readability',
          'refactor',
          'refacto',
          'rename',
        ],
      },
      {
        type: 'fix',
        keywords: [
          'bug',
          'fix',
          'hack',
          'issue',
          'resolved',
          'tweak',
          'workaround',
          '->',
          '=>',
        ],
      },
      {
        type: 'feat',
        keywords: [
          'add',
          'deprecate',
          'feat',
          'implementation',
          'implements',
          'implement',
        ],
      },
    ];

    const foundType = _.find(items, (item) => {
      return item.keywords.some((word) => {
        return subject.toLowerCase().includes(word);
      });
    });
    // If can't find the state, assume it's a feat
    return foundType ? foundType.type : 'feat';
  },

  /**
   * Checks if a commit subject indicates a release commit by matching version patterns.
   * @param {string} subject - The commit subject to test
   * @returns {boolean} True if the subject matches a release version pattern, false otherwise
   */
  isReleaseCommit(subject) {
    // Version 2.0.0
    // 3.11.2 - 2023-01-09
    // 7.4.4
    // v6.8.3
    // Version v3.0.1
    return /^\s*(Version\s*)?(v)?\d+\.\d+\.\d+/.test(subject);
  },
};
