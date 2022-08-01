import { scenarios, logging } from '@kroger/cx-core-web-server'
import { join } from 'path'
import fs from 'fs-extra'
import { createRequire } from 'module';


const require = createRequire(import.meta.url);
const { readJSON, writeJSON } = fs
const { LOG, Logger }  = logging
const { Scenario } = scenarios

let updating
const handleModulesChanged = async (tags, modules) => {
  console.log('handleModuleConfigChanged')
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

const scenario = ({ tags, transport }) =>
  (dynamicConfiguration = {}) => {
    const log = new Logger({
      level: dynamicConfiguration.federationLogLevel || LOG.DEBUG,
      transport,
      sender: 'federation',
      category: 'scenario',
      subcategory: 'update',
    })

    // we should consider inverting this to -> loglevels.federation, I think we can still
    // watch one level deeper, but need to verify
    dynamicConfiguration.watch('federationLogLevel', (value) => {
      log.level = value
      configLoader.attachResources({ logger: log })
    })

    dynamicConfiguration.watch('federation', (config) => {
      handleModulesChanged(tags, config.modules)
    })

    return new Scenario({
      name: 'federation',
      persist: true,
      callback: async (data) => {
        log.info("federation configuration update interval")
        //this is where we need to do yarn upgrade 
      },
      reducer: (state = {}, action, { play }) => {
        return state
      },
    })
  }


export default ({
  tags,
  transport,
  interval = 60000,
}) => {
  return [
    scenario({ cacheDir, transport }),
    {
      playInterval: interval,
      playOnStart: true,
    },
  ]
}
