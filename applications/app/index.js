import { initialize } from '@kroger/kap-federation-controller';
import a from '@kroger/kap-test-module-a'


import fs from 'fs-extra'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { readFile, readJSON, writeJSON } = fs


const bootstrap = async () => {

  // register all of the async modules
  // await initialize('http://localhost:3000',)

  // // console.log(a)
  // await a.load()
  // // console.log(a)
  // console.log(a.getMessage())
  // a.message = "a new message"
  // console.log(a.getMessage())

  // lets test getting file contents from the yarn cache
  // const path = require.resolve('@kroger/cx-core-web-server/package.json')
  // console.log(path)

  // const contents = await readFile(path, { encoding: 'utf8' })
  // console.log(contents)

  const tags = ['alpha', 'beta', 'latest', 'canary', 'stable']
  const modules = [
    {
      "id": "@kroger/kap-test-module-a",
      "tags": {
        "alpha": "workspace:^",
        "beta": "workspace:^",
        "latest": "workspace:^",
        "canary": "workspace:^",
        "stable": "workspace:^"
      }
    },
    {
      "id": "@kroger/kap-test-module-b",
      "tags": {
        "alpha": "workspace:^",
        "beta": "workspace:^",
        "latest": "workspace:^",
        "canary": "workspace:^",
        "stable": "workspace:^"
      }
    }    
  ]

  let tag
  for (tag of tags) {
    const pkgPath  = require.resolve(`@kroger/kap-federation-${tag}-cache/package.json`)
    const pkg = await readJSON(pkgPath)
    pkg.dependencies = modules.reduce((d, { id, tags:mtags }) => {
      // TODO: determine the best way to do this... EG:
      // if a tag valy is not specified, do we use the tag itself as a default
      // or do we use latest, or do we allow authors to specify default behavior?
      d[id] = mtags[tag]
      return d
    }, {})

    await writeJSON(pkgPath, pkg, { spaces: "  "})
  }




}

await bootstrap()

