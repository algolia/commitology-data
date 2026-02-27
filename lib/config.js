import { absolute, gitRoot } from 'firost';
import Gilmore from 'gilmore';

export const repo = new Gilmore('/home/tim/local/www/algolia/instantsearch');

export const dataInputCommitsPath = absolute(gitRoot(), 'data/input/commits');
