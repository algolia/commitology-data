import { _, pMap, pProps } from 'golgoth';
import { glob, readJson } from 'firost';
import { inputPath as authorInputPath } from './author.js';
import { outputDirectory as commentOutputDirectory } from './comment.js';
import { outputDirectory as commitOutputDirectory } from './commit.js';
import { outputDirectory as issueOutputDirectory } from './issue.js';
import { outputDirectory as pullOutputDirectory } from './pull.js';
import { outputDirectory as userOutputDirectory } from './user.js';

let __ = {};

/**
 * Retrieves and normalizes all records from JSON files in commit, issue, pull request, and comment directories
 * @returns {Promise<Array>} Promise that resolves to an array of normalized record objects
 */
export async function getRecords() {
  // Warm up cache
  await __.initUserCache();
  await __.initAuthorCache();

  // All filepaths
  const commitsPaths = await glob('./**/*.json', {
    cwd: commitOutputDirectory,
  });
  const issuesPaths = await glob('./**/*.json', {
    cwd: issueOutputDirectory,
  });
  const pullsPaths = await glob('./**/*.json', {
    cwd: pullOutputDirectory,
  });
  const commentsPaths = await glob('./**/*.json', {
    cwd: commentOutputDirectory,
  });
  const filepaths = [
    ...commitsPaths,
    ...issuesPaths,
    ...pullsPaths,
    ...commentsPaths,
  ];

  return await pMap(filepaths, async (filepath) => {
    const record = await readJson(filepath);
    return normalizeRecord(record);
  });
}

/**
 * Normalizes a record by processing user and author information
 * @param {object} inputRecord - The record object to be normalized
 * @returns {Promise<object>} A promise that resolves to the normalized record with processed user and author data
 */
export async function normalizeRecord(inputRecord) {
  return __.normalizeUserAndAuthors(inputRecord);
}

__ = {
  /**
   * Normalizes user and author fields in a record by converting them to their respective record objects
   * @param {object} record - The record object containing user and/or author fields to normalize
   * @returns {Promise<object>} The record with normalized user and author fields
   */
  async normalizeUserAndAuthors(record) {
    if (record.user) {
      record.user = await __.getUser(record.user);
    }
    if (record.author) {
      record.author = await __.getAuthor(record.author);
    }

    // Recursively apply to all object keys
    await pProps(record, async (value, key) => {
      if (!_.isObject(value)) {
        return;
      }
      record[key] = await __.normalizeUserAndAuthors(value);
    });
    return record;
  },

  userCache: null,

  /**
   * Initializes the user cache by loading all JSON files from the issue output directory
   * @returns {Promise<void>} A promise that resolves when the cache is fully initialized
   */
  async initUserCache() {
    if (__.userCache) {
      return;
    }
    __.userCache = {};

    const userFilepaths = await glob('./**/*.json', {
      cwd: userOutputDirectory,
    });
    await pMap(userFilepaths, async (filepath) => {
      const user = await readJson(filepath);
      __.userCache[user.id] = user;
    });
  },

  /**
   * Retrieves a user record by ID, initializing the user cache if necessary
   * @param {string} recordId - The unique identifier of the user record to retrieve
   * @returns {Promise<object | undefined>} The user record object if found, undefined otherwise
   */
  getUser(recordId) {
    return __.userCache[recordId];
  },

  authorCache: null,

  /**
   * Initializes the author cache by reading author data from a JSON file and populating the cache object
   * @returns {Promise<void>} A promise that resolves when the author cache has been initialized
   */
  async initAuthorCache() {
    if (__.authorCache) {
      return;
    }
    __.authorCache = await readJson(authorInputPath);
  },

  /**
   * Retrieves the user record for a given author from the author cache
   * @param {string} authorName - The name of the author to look up
   * @returns {object} The user record associated with the author
   * @throws {Error} Throws firostError when author ID is -1
   */
  getAuthor(authorName) {
    const author = __.authorCache[authorName];
    return __.getUser(author.id);
  },
};
