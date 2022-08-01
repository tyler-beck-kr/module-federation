import chalk from 'chalk'
import bodyparser from 'koa-bodyparser'
import { start, scenarios, features, logging, ConfigurationLoader,
  FileConfigurationSource
 } from '@kroger/cx-core-web-server'
import { CHUNK_PATH, MANIFEST_PATH } from '@kroger/kap-federation-controller'
import chunkMiddleware from './routes/chunk.mjs'
import { getManifest, postManifest } from './routes/manifest.mjs'
import moduleUpdater from './scenarios/update-federation.mjs'

const { composeBindings, map } = logging
// ----------------------------------------------------------------------------
// logging transport - sends top-level logged output to reciever
// ----------------------------------------------------------------------------
const transport =
  (color = 'grey') =>
  ({ level = 100, sender, ...rest } = {}) => {
    const logMethod = map[level] || 'debug'
    // eslint-disable-next-line
    console[logMethod](chalk[`${color}`](`[${sender}]`), rest)
}

// ----------------------------------------------------------------------------
// modules - with a few non-breaking changes to configuration loader, we could 
// make this a configureable list.
// ----------------------------------------------------------------------------
const federatedModules = {
  '@kroger/kap-test-module-a':  `../../modules/module-a/dist/radpack/`,
  '@kroger/kap-test-module-b':  `../../modules/module-b/dist/radpack/`,
}

// ----------------------------------------------------------------------------
// dynamic configuration loader
// ----------------------------------------------------------------------------
const configLoader = new ConfigurationLoader({
  // any config that starts with "__" gets spread onto the root configuration
  __root: new FileConfigurationSource({
    id: 'default',
    path: './config/default.json',
    ttl: 0,
  }),

  // list of modules for which system should enable federation
  federation: new FileConfigurationSource({
    id: 'federatedModules',
    path: './config/federated-modules.json',
    ttl: 10000,
  }),

})

// ----------------------------------------------------------------------------
// tags - these are the variants that the modules server will support
// ----------------------------------------------------------------------------
const tags = [
  "alpha",
  "beta",
  "latest",
  "canary",
  "stable"
]

// ----------------------------------------------------------------------------
// start server
// ----------------------------------------------------------------------------
start({
  port: 3000,
  numWorkers: 4,
  awaitDynamicConfig: true,
  connectRouter: true,
  scenarios: [
    scenarios.passthrough({ transport: transport('grey') }),
    scenarios.dynamicConfig({
      transport: transport('green'),
      configLoader,
      interval: 5000,
    }),
    moduleUpdater({
      tags,
      interval: 10000,
      transport: transport('cyan')
    })
  ],
  features: [
    ({ server, logger, router, federation, ...config }) => {
      //should probably move this to a composed /radpack route group 
      server.use(bodyparser())
      
      //TODO: move the router.s into routes, pass in router
      router.get(
        `${CHUNK_PATH}/:tag/*chunk`,
        composeBindings(
          {
            category: 'radpack',
            subcategory: 'chunk',
          },
          chunkMiddleware({ federatedModules: federation, config })
        )
      )

      //TODO: move the router.s into routes, pass in router
      router.get(
        `${MANIFEST_PATH}/:tag/*module`,
        composeBindings(
          {
            category: 'radpack',
            subcategory: 'manifest',
          },
          getManifest({ federatedModules: federation, config })
        )
      ) 

      //TODO: move the router.s into routes, pass in router
      router.post(
        `${MANIFEST_PATH}`,
        composeBindings(
          {
            category: 'radpack',
            subcategory: 'custom-manifest',
          },
          postManifest({ federatedModules: federation, config })
        )
      ) 
    }
  ],
  
})
