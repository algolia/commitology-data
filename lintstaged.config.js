import config from 'aberlaas/configs/lintstaged';

// Skip all linting of JSON files in ./data
const newConfig = { ...config };
newConfig['**/*.json,!./data/**/*.json'] = newConfig['**/*.json'];
delete newConfig['**/*.json'];

export default newConfig;
