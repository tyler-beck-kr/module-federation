import chunkMiddleware from './routes/chunk.mjs'
import manifestMiddleware from './routes/manifest.mjs'
import bodyparser from 'koa-bodyparser'
import { CHUNK_PATH, MANIFEST_PATH } from '@kroger/kap-federation-controller'
import { logging } from "@kroger/cx-core-web-server"

const { composeBindings } = logging

export default (/* static configuration */) => ({ server, logger, router, federatedModules, radpack, ...config }) => {
  //should probably move this to a composed /radpack route group 
  server.use(bodyparser())
  router.get(
    `${CHUNK_PATH}/*chunk`,
    composeBindings(
      {
        category: 'radpack',
        subcategory: 'chunk',
      },
      chunkMiddleware({ federatedModules, })
    )
  )

  router.get(
    `${MANIFEST_PATH}/*module`,
    composeBindings(
      {
        category: 'radpack',
        subcategory: 'manifest',
      },
      manifestMiddleware({ federatedModules, config })
    )
  ) 

}
