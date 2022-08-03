import { HybridFederatedModule } from '@kroger/kap-federation-controller'
import a from '@kroger/kap-test-module-a'

const MAJOR_VERSION = '0' //TODO: automagically set this value in the build

class ModuleB extends HybridFederatedModule {

  constructor() {
    super({
      id: `@kroger/kap-test-module-b@^${MAJOR_VERSION}/implementation`,
      asyncDefinition: {
        getMessage: { fn: true },
        getNumbers: { fn: true },
        message: { set: true },
      }
    })

    // add reference to another hybrid module here
    this.a = a
    

  }

  // override the load method to also load dependent radpack modules
  async load( reload=false ) {
    // creat an array of promises to resolve concurrently
    const loaders =  [
      super.load(reload), // load this module
      a.load(reload) // load dependent module,  may already be loaded
    ]
    // await them all
    const result = await Promise.all(loaders)

    // we can technically return whatever we want
    return result[0]
  }
  
}

// we don't need to export the class itself, just use it for its async tricks
const instance = new ModuleB()

export default instance

