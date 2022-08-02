import chalk from 'chalk'
import bodyparser from 'koa-bodyparser'
import { start, scenarios, features, logging, ConfigurationLoader,
  FileConfigurationSource
 } from '@kroger/cx-core-web-server'
import moduleUpdater from './lib/scenario.mjs'
import federationFeature from './lib/feature.mjs'

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
    ttl: 60000,
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
      interval: 120000,
      transport: transport('cyan')
    })
  ],
  features: [
    federationFeature({ tags })
  ],
  
})
