import { HybridFederatedModule } from '@kroger/kap-federation-controller'

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
  }
  
}

// we don't need to export the class itself, just use it for its async tricks
const instance = new ModuleB()

export default instance

