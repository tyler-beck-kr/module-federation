import fs from 'fs-extra'
import { resolve, join, dirname } from 'path'
import resolveCachedModule from '../utils/resolveCachedModule.mjs'

const { readFile } = fs


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
 * Koa middleware  for serving radpack chunk
 *
 * @param {*} ctx
 * @param {*} next
 */
const getMiddleware = ({ federatedModules }) => {
  // map configured modules for easy access
  const mappedModules = federatedModules.reduce((map, mod) => {
    map[mod.id] = mod
    return map
  }, {})

  return async (ctx, next) => {
 
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
      const artifactsPath = dirname( await resolveCachedModule(name, tag) )
      const chunkPath = join(artifactsPath, chunk)
      const rawChunk = await readFile(chunkPath, { encoding:'utf8'})
      ctx.body = updateChunkDefinition(tag, name, rawChunk)
      ctx.status = 200
    }

    await next()
  }
}

export default getMiddleware
