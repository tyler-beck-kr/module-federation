import { scenarios, logging } from '@kroger/cx-core-web-server'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs-extra'
import {parseSyml, stringifySyml} from '@yarnpkg/parsers';
import { createRequire } from 'module'
import { readFile } from 'fs'


const require = createRequire(import.meta.url);
const { readJSON, writeJSON } = fs
const { constants:LOG, Logger }  = logging
const { Scenario } = scenarios
const asyncExec = promisify(exec)

const scenario = ({ tags, transport }) =>
  (dynamicConfiguration = {}) => {
    const log = new Logger({
      level: dynamicConfiguration.federationLogLevel || LOG.DEBUG,
      transport,
      sender: 'federation',
      category: 'scenario',
      subcategory: 'update',
    })

    // can this be moved into scenario state?
    let modules
    let modulesLastChanged = 0
    let lastUpdate = 0

    const handleModulesChanged = async (modules) => {
      modulesLastChanged = Date.now()
    }

    // we should consider inverting this to -> loglevels.federation, I think we can still
    // watch one level deeper, but need to verify
    dynamicConfiguration.watch('federationLogLevel', (value) => {
      log.level = value
      configLoader.attachResources({ logger: log })
    })

    dynamicConfiguration.watch('federation', (list) => {
      log.debug('apply module config change')
      modules = list
      modulesLastChanged = Date.now()
    })

    return new Scenario({
      name: 'federation',
      persist: true,
      callback: async (data) => {
        // only update if modules have changed
        if (modulesLastChanged > lastUpdate) {
          lastUpdate = Date.now()
          log.debug("update federation modules")

          // 1) update package jsons in caches
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

          // 2) modify yarn lock if needed.
          // TODO: check yarn behavior when installing packages with tags,
          // does yarn update the lockfile on install if a new tag is pushed?
          // if it does not, we will need to parse the yarn.lock file and 
          // remove entries for the module cache workspaces so that yarn will 
          // resolve new entries.
        
          // TODO: get lock file path from configuration
          // const lockFilePath = 'yarn.lock'
          // const contents = await readFile(lockFilePath, { encoding: 'utf8' })
          // const lockFile = parseSyml(contents)
          // console.log(lockFile)

          // 3) execute yarn install to get new module zips
          try {
            await asyncExec('yarn')
            log.info('module update complete')
          } catch (e) {
            log.warn({
              msg: "module upate failed",
              stdout: e.stdout
            })
          }
        }

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
    scenario({ tags, transport }),
    {
      playInterval: interval,
      playOnStart: true,
    },
  ]
}
