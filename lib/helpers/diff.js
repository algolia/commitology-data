/**
 * Normalizes diff information from a commit or pull request
 * Handles both commit format (changedFilesCount, addedLinesCount, deletedLinesCount)
 * and pull request format (changed_files, additions, deletions)
 * @param {object} input - The input commit or pull request object
 * @returns {object} Normalized diff object with changedFiles, addedLines, deletedLines
 */
export function normalizeDiff(input) {
  return {
    changedFiles: input.changedFilesCount || input.changed_files,
    addedLines: input.addedLinesCount || input.additions,
    deletedLines: input.deletedLinesCount || input.deletions,
  };
}
