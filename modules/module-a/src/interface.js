import { HybridFederatedModule } from '@kroger/kap-federation-controller'
 
class ModuleA extends HybridFederatedModule {

  constructor() {
    super({
      id: '@kroger/kap-test-module-a/implementation',
      asyncDefinition: {
        getMessage: { fn: true },
        getNumbers: { fn: true },
        message: { set: true },
        status: {} // doesn't create shell method but allows for overriding implementation
      },
      createShell: true
    }) 
  }

  status() {
   return 'implementation unloaded'
  }

}

// we don't need to export the class itself, just use it for its async tricks
const instance = new ModuleA()

export default instance

