import { pMap } from 'golgoth';
import { absolute, gitRoot, glob, readJson, remove, writeJson } from 'firost';

const pullsDir = absolute(gitRoot(), 'data/input/pulls');

console.log('Finding all PR JSON files...');
const files = await glob('**/*.json', { cwd: pullsDir });
console.log(`Found ${files.length} files to migrate`);

let renamed = 0;
await pMap(
  files,
  async (filepath) => {
    // filepath is relative to pullsDir, like "2024/07/6260.json"
    const fullPath = absolute(pullsDir, filepath);
    const dirPath = fullPath.replace('.json', '');
    const basicPath = absolute(dirPath, 'basic.json');

    // Read the file content
    const content = await readJson(fullPath);

    // Write to new location
    await writeJson(content, basicPath);

    // Remove old file
    await remove(fullPath);

    renamed++;
    if (renamed % 100 === 0) {
      console.log(`Renamed ${renamed}/${files.length}...`);
    }
  },
  { concurrency: 10 },
);

console.log(
  `✅ Successfully migrated ${renamed} pull request files to new structure`,
);
