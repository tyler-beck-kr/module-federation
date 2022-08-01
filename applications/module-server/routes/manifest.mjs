import { join } from 'path'
import fs from 'fs-extra'

const { readJSON } = fs

const getMiddleware = ({ federatedModules, config }) => async (ctx, next) => {

  // map configured modules for easy access
  const mappedModules = federatedModules.reduce((map, mod) => {
    map[mod.id] = mod
    return map
  }, {})

  // get module manifest from specified tag cache, defaulting to stable
  const getModuleManifest = async (name, tag='stable') => {

    const locator = await import(`@kroger/kap-federation-${tag}-cache`)
    const manifestPath = locator.default(name) // path to radpack.json

    //TODO: add caching based on package version

    const manifest = await readJSON( manifestPath )

    return manifest
  }

  const getAllManifests = async ( tag='stable') => await Promise.all(
    federatedModules.map(({ id }) => getModuleManifest(id, tag))
  )

  if (ctx.params.module === '/*') {
    ctx.body = { exports : (await getAllManifests()).reduce((result, def) => {
      return Object.assign(result, def.exports)
    }, {}) }
    ctx.status = 200  
  } else {
    const tag = ctx.params.tag
    const moduleId = ctx.params.module.substring(1)
    if (mappedModules[moduleId]){
      const manifest = await getModuleManifest(moduleId, tag)
      if (manifest){
        ctx.body = manifest
        ctx.status = 200  
      }
    }
  }

  await next()
}

export default getMiddleware


// router.post(
//   `${MANIFEST_PATH}`,
//   composeBindings(
//     {
//       category: 'radpack',
//       subcategory: 'filtered-manifest',
//     },
//     async (ctx, next) => {
//       const list = ctx.req.body
//       if (!Array.isArray(list)) {
//         ctx.status = 400
//         ctx.body = "Bad Request - Expected JSON Array"
//       } else { 
//         const manifests = list.map(name => getModuleManifest(name)).filter(Boolean)
//         ctx.body = { exports :  getAllManifests().reduce((result, def) => {
//           return Object.assign(result, def.exports)
//         }, {}) }
//         ctx.status = 200
//       }
//       await next()
//     }
//   )
// ) 

