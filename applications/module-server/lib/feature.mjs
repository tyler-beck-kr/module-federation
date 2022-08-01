import { resolve, join, dirname } from 'path'
import fs from 'fs-extra'
import bodyparser from 'koa-bodyparser'
import { CHUNK_PATH, MANIFEST_PATH } from '@kroger/kap-federation-controller'
import { logging } from '@kroger/cx-core-web-server'

const { composeBindings } = logging
const { readJSON, readFile } = fs

/**
 * gets a module manifest path based on module name and tag
 *
 * @param {string} moduleName - name of module
 * @param {string} tag - tag to target
 * @return {string} absolute path to manifest (radpack.json)
 */
const resolveModuleManifest = async (moduleName, tag) => {
  // we may be able to statically import the locator classes, but this is more extensible
  const locator = await import(`@kroger/kap-federation-${tag}-cache`)

  //call locator to get manifest path for module for given tag
  return locator.default(moduleName) // path to radpack.json
}


/**
 * loads a module manifest artifact and transforms it to be compatible with chunk routes
 *
 * @param {string} moduleName - name of module
 * @param {string} [tag='stable'] - tag to target
 * @return {object} the manifest
 */
const getModuleManifest = async (moduleName, tag = 'stable') => {

  // get path to radpack.json based on tag and module name
  const manifestPath = await resolveModuleManifest(moduleName, tag) 

  //TODO: add caching based on package version / tag
  const manifest = await readJSON( manifestPath )

  // remapManifestFilePaths  - need to update paths in manifests and in chunks in
  // order to prevent errors. We should do a PR to add a file validation helperfn.
  // this issue is described in detail in the updateChunkDefinition description 
  Object.keys(manifest.exports).forEach((moduleName) => {
    manifest.exports[moduleName].d.forEach((entry) => {
      entry[1].forEach((asset) => {
        asset.f = `${tag}/${moduleName}/${asset.f}`
      })
    })
  })
  
  return manifest
}


/**
 * need to update paths in manifests and in chunks in 
 * order to prevent errors. We should do a PR to add a
 *  file validation helperfn.
 * 
 * In the chunk, the first parameter of the define method defaults
 * to "[moduleName]/[chunk-path]"  This value is compared to the url from which the 
 * chunk is loaded.  It assumes the chunk was loaded from [chunk-path]. In order for
 * this to validate and load asynchronously via radpack, we need to update the path
 * in the chunk to match the path it will actually be loaded from excluding the base url.
 * This results in an odd looking string... something like: 
 * "[module-name]/[tag]/[module-name]/[chunk-path]"
 *
 * @param {String} moduleName
 * @param {String} rawChunk
 * @return {String} 
 */
 const updateChunkDefinition = (tag, moduleName, rawChunk) => {
  const parts = rawChunk.split(',', 1)
  const split = rawChunk.indexOf('"')+1
  return [rawChunk.slice(0,split),moduleName,'/',tag,'/', rawChunk.slice(split)].join('')
}


/**
 * feature implementation for serving manifest files and chunks
 * @exports
 * @param {*} {
 *   tags // managed tags 
 * }
 * @returns {function} 
 */
 export default ({
  /* static configuration */
  tags // managed tags 
}) => ({
    /* dynamic configuration */
    federation, // federated module definitions
    server,
    router,
    logger,
    ...dynamicConfig
  }) => {

    /**
     * getAllManifests -  resolves array manifests from all configured federation modules
     *
     * @param {string} [tag='stable']
     * @returns {Promise} returns promise of array of manifests
     */
    const getAllManifests = async ( tag='stable') => await Promise.all(
      federation.map(({ id }) => getModuleManifest(id, tag))
    )

    // map configured modules for easy access
    const mappedModules = federation.reduce((map, mod) => {
      map[mod.id] = mod
      return map
    }, {})

    //should probably move this to a composed /radpack route group 
    server.use(bodyparser())

    // Add route for getting manifest for specific modules or all modules 
    // will probably want to drop the list all option at some point.
    router.get(
      `${MANIFEST_PATH}/:tag/*module`,
      composeBindings(
        {
          category: 'radpack',
          subcategory: 'manifest',
        },
        async (ctx, next) => {

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
      )
    ) 

    // Add route for posting a custom module/tag configuration
    router.post(
      `${MANIFEST_PATH}`,
      composeBindings(
        {
          category: 'radpack',
          subcategory: 'custom-manifest',
        },
        async (ctx, next) => {
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
      )
    )

    // Add route for getting a custom module/tag configuration
    router.get(
      `${CHUNK_PATH}/:tag/*chunk`,
      composeBindings(
        {
          category: 'radpack',
          subcategory: 'chunk',
        },
        async (ctx, next) => {
 
          const tag = ctx.params.tag
          //*chunk = moduleName/chunk
          const parts = ctx.params.chunk.split('/')
          const chunk = parts[parts.length - 1]
          const name = parts.slice(1,-1).join('/')
          ctx.log.addBindings({
            module: name,
            chunk,
            tag
          })
          if (mappedModules[name]){
            //TODO: need to lock this down and sanitize!
            // get rid of escapes and ../ in chunk
            //TODO: add caching
            const artifactsPath = dirname( await resolveModuleManifest(name, tag) )
            const chunkPath = join(artifactsPath, chunk)
            const rawChunk = await readFile(chunkPath, { encoding:'utf8'})
            ctx.body = updateChunkDefinition(tag, name, rawChunk)
            ctx.status = 200
          }
      
          await next()
        }
      )
    )


  }
