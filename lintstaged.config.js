import config from 'aberlaas/configs/lintstaged';

const newConfig = { ...config };

// Skip all linting of JSON files in ./data
newConfig['**/*.json,!./data/**/*.json'] = newConfig['**/*.json'];
delete newConfig['**/*.json'];

// Skip agent testing
delete newConfig['**/lib/**/*.js'];

export default newConfig;
