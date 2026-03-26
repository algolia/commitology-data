import { glob, readJson, remove, spinner } from 'firost';
import { absolute, gitRoot } from 'firost';
import { isValid } from '../lib/helpers/sentiment.js';

const progress = spinner();

// Find all sentiment.json files
const inputDirectories = [
  'data/input/issues',
  'data/input/pulls',
  'data/input/commits',
  'data/input/comments',
];

let totalChecked = 0;
let totalInvalid = 0;
let totalDeleted = 0;

for (const dir of inputDirectories) {
  const directory = absolute(gitRoot(), dir);
  const sentimentFiles = await glob('./**/sentiment.json', { cwd: directory });
  const sentimentDirs = await glob('./**/sentiment/*.json', { cwd: directory });

  const allFiles = [...sentimentFiles, ...sentimentDirs];

  progress.tick(`Checking ${allFiles.length} sentiment files in ${dir}...`);

  for (const filepath of allFiles) {
    totalChecked++;

    try {
      const sentiment = await readJson(filepath);

      if (!isValid(sentiment)) {
        totalInvalid++;
        console.log(`\n❌ Invalid sentiment: ${filepath}`);
        console.log(`   Data: ${JSON.stringify(sentiment)}`);

        // Delete the invalid sentiment file
        await remove(filepath);
        totalDeleted++;
        console.log(`   ✓ Deleted`);
      }
    } catch (error) {
      console.error(`\n⚠️  Error reading ${filepath}: ${error.message}`);
    }
  }
}

progress.success(`
Checked: ${totalChecked} files
Invalid: ${totalInvalid} files
Deleted: ${totalDeleted} files
`);
