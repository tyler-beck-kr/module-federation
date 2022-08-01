import { createRequire } from 'module';
const require = createRequire(import.meta.url);

//this modules 1 and only job is to resolve a path to the cached module
export default (name) => require.resolve(`${name}/package.json`)

