import fs from 'fs-extra'
import { resolve, join } from 'path'

const { readFile } = fs


/**
 * need to update paths in manifests and in chunks in 
 * order to prevent errors. We should do a PR to add a
 *  file validation helperfn.
 *
 * @param {String} moduleName
 * @param {String} rawChunk
 * @return {String} 
 */
const updateChunkDefinition = (moduleName, rawChunk) => {
  const parts = rawChunk.split(',', 1)
  const split = rawChunk.indexOf('"')+1
  return [rawChunk.slice(0,split), moduleName+'/', rawChunk.slice(split)].join('')
}

/**
 * Koa middleware  for serving radpack chunk
 *
 * @param {*} ctx
 * @param {*} next
 */
const getMiddleware = ({ federatedModules }) => async (ctx, next) => {
  //*chunk = moduleName/chunk
  const parts = ctx.params.chunk.split('/')
  const chunk = parts[parts.length - 1]
  const name = parts.slice(1,-1).join('/')
  ctx.log.addBindings({
    module: name,
    chunk
  })

  //TODO: need to lock this down and sanitize!
  // get rid of escapes and ../ in chunk
  //TODO: add caching
  const rawChunk = await readFile(join(resolve(federatedModules[name]), chunk), { encoding:'utf8'})
  ctx.body = updateChunkDefinition(name, rawChunk)
  ctx.status = 200
  await next()
}

export default getMiddleware
