import { join } from 'path'
import fs from 'fs-extra'
import resolveCachedModule from '../utils/resolveCachedModule.mjs'

const { readJSON } = fs

// get module manifest from specified tag cache, defaulting to stable
const getModuleManifest = async (name, tag = 'stable') => {

  // get path to radpack.json based on tag and module name
  const manifestPath = await resolveCachedModule(name, tag) 

  //TODO: add caching based on package version / tag
  const manifest = await readJSON( manifestPath )

  // remapManifestFilePaths  - need to update paths in manifests and in chunks in
  // order to prevent errors. We should do a PR to add a file validation helperfn.
  Object.keys(manifest.exports).forEach((name) => {
    manifest.exports[name].d.forEach((entry) => {
      entry[1].forEach((asset) => {
        asset.f = `${tag}/${name}/${asset.f}`
      })
    })
  })
  
  return manifest
}


const getManifest = ({ federatedModules, config }) => {
    
  // map configured modules for easy access
  const mappedModules = federatedModules.reduce((map, mod) => {
    map[mod.id] = mod
    return map
  }, {})

  const getAllManifests = async ( tag='stable') => await Promise.all(
    federatedModules.map(({ id }) => getModuleManifest(id, tag))
  )

  return async (ctx, next) => {

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
}

const postManifest = ({ federatedModules, config }) =>  async (ctx, next) => {
  const moduleSpecifier = ctx.request.body
  ctx.log.addBindings({
    body: moduleSpecifier
  })

  // TODO: lots of assumptions about the request body being made here, need to add some checks and error handling
  const list = Object.entries(moduleSpecifier).map(([name, tag]) => getModuleManifest(name, tag)) // array of promises
  const manifests = await Promise.all(list)

  // // TODO: use radpack merge logic
  const mergedExports = manifests.reduce((result, def) => {
    return Object.assign(result, def.exports)
  }, {})

  ctx.body = { exports: mergedExports }
  ctx.status = 200

  await next()
}

export {
  getManifest,
  postManifest
}


