import { HybridFederatedModule } from '@kroger/kap-federation-controller'

const MAJOR_VERSION = '1' //TODO: automagically set this value in the build
 
class ModuleA extends HybridFederatedModule {

  constructor() {
    super({
      id: `@kroger/kap-test-module-a@^${MAJOR_VERSION}/implementation`,
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

//in this example we don't need to export the class itself, just use it for its async tricks
const instance = new ModuleA()

export default instance

