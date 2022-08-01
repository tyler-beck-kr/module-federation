import { createRequire } from 'module';

// Why this? well, radpack's exports aren't exactly inline with the nodejs spec
// TODO: PR to radpack to define exports in node compliant manner
// I think we will need to update to import to be browser compliant or transpile... blah.
const require = createRequire(import.meta.url);
const radpack = require('@radpack/server')

const ERROR_UNLOADED = 'HybridFederatedModule async implementation must be loaded before accessing property'
const ERROR_IMPLEMENTATION_MISMATCH= 'HybridFederatedModule implementation mismatch.'

export const MANIFEST_PATH = '/federation/manifest'
export const CHUNK_PATH = '/federation/chunk'

/**
 * unloadedErrorFn - placeholder for interface methods prior to implementation load
 * technically an error would be thrown anyway for attempting to execute undefined,
 * but this is easier to understand
 * @throws ERROR
 */
const unloadedErrorFn = (name) => () => {
  throw new Error(ERROR_UNLOADED, name)
}

/**
 * reference to the initialization promise, used to debounce initializaton calls
 * @type {Promise} */
let controllerInitialization

   /**
  * initialze - initializes federated module controller
  * encapsulates radpack.register, currently returns all 
  * manifest with all known federated modules
  * 
  * TODO: only return manifest with exports that are relevant to an app.
  * limitations --- Radpack does not currently honor all fetch options, so we're limited to GET requests
  * Options:
  * 1) Static configuration for each application - straightforward implementation, opportunity for runtime config mismatches
  * 2) register with multiple urls... this will work but as the number of federated modules an app uses increases it will become untenable
  * 3) Dual request, post list, return hash then get manifest based on hash (lots of hoops for this option)
  * 4) Post list, return custom - not supported by radpack as of @radpack/core@1.0.4 
  *  EG: {
  *   method: 'POST',
  *   headers: { 'Content-Type': 'application/json' },
  *   body: JSON.stringify(modules)
  *  }
  * @export
  * @param {*} url federation module server root url
  * @param {boolean} [reload=false] override existing registration and reload. needs to be tested
  * @return {*} 
  */
export async function initialize({ manifest, moduleRegistry, reload = false}) {
    
      // only initiate registration if it hasn't been called yet or if we are forcing a reload
      if (reload || !controllerInitialization) {
        // structure registration
        controllerInitialization = radpack.register({ 
          url: `${manifest}`,
          vars: {
            baseUrl:  `${moduleRegistry}${CHUNK_PATH}`
          }
        })
      }
      // Always return the global promise for radpack initialization.  
      // This allows us to execute the same call across multiple locations
      return await controllerInitialization
    }
  

/**
 * Federated Modules should extend this class to take advantage of async implementation loading
 *
 * @export
 * @class HybridFederatedModule
 */
export class HybridFederatedModule {
  // id to load from server
  #moduleId

  // promise of module load
  #loading

  // description of async interface to be added to class
  #asyncDefinition

  // the export that provides the object property definition in the async module
  #definitionProp

  /**
   * Creates an instance of HybridFederatedModule.
   * @param {*} { moduleId,  asyncDefinition, createShell = true }
   * @memberof HybridFederatedModule
   */
  constructor({ id, asyncDefinition, definitionProp = 'default', createShell = true }) {
    this.#moduleId = id
    this.#asyncDefinition = asyncDefinition
    this.#definitionProp = definitionProp
    this.load = this.load.bind(this)

    // Set up a shell interface that throws errors until implementation is loaded and applied
    if (createShell) {
      this.#createShellImplementation()
    }
  }

  /**
   * createShellImplementation iterates through the provided asyncDefinition and 
   * stubs out the supplied properties with a function that throws an error
   * async definitions that provide props without options (see "c") do not stub out 
   * an error throwing method and are intended to be used with methods that have both
   * static and dynamic implementations.
   *
   * exampleAsyncDefinition = {
   *   a: { fn: true }, //creates a function
   *   b: { get: true, set: true }, // creates a getter/setter
   *   c: true, //defines a prop for validation, but defines nothing.
   * }
   *
   * @private
   * @memberof HybridFederatedModule
   */
   #createShellImplementation() {
    // TODO: account for public/private methods and props in definition
    //build the shell implementation from the async definition
    const shellImplementation = Object.keys(this.#asyncDefinition).reduce((def, prop) => {

      // destructure the properties that will trigger stubbing
      // non-object types get destructured to undefined so don't worry :-)
      const { fn, get, set } = this.#asyncDefinition[prop]

      if (fn) {
        // function definition
        def[prop] = {
          configurable: true,
          value: unloadedErrorFn(prop)
        }
      } else if ( get || set ) {
        def[prop] = {
          configurable: true,
          get: get ? unloadedErrorFn(`get ${prop}`) : undefined,
          set: set ? unloadedErrorFn(`set ${prop}`) : undefined
        }
      }

      return def
    }, {})

    // apply shell interface to this using defineProperties
    // note that configurable has been set to true for each property
    // so that we can overwrite with the async implementation
    Object.defineProperties(this, shellImplementation)
  }

 /**
   * isValidImplementation checks if the asynchronously loaded implementation 
   * matches the asyncDefinition provided at build time.  Currently this entails ensuring that 
   * the keys provided in the asyncDefinition are all properties of the implementation.
   * This allows for additional methods to be added to the implementation (feature bumps)
   * without breaking the interface.
   * 
   * Throws if implementation does not match interface
   *
   * @param {*} implementation - an object that can be passed to Object.defineProperties()
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
   * @return {Boolean} 
   * @memberof HybridFederatedModule
   */
  #isValidImplementation(implementation) {
    //keep this simple for now, ensure async implementation, has expected properties
    const problems = Object.keys(implementation).map(key => !implementation.hasOwnProperty(key)).filter(Boolean)
    
    // if we find any porblems throw an error
    if (problems.length) {
      throw new Error(`ERROR_IMPLEMENTATION_MISMATCH\n`+
      `Expected: ${Object.keys(this.#asyncDefinition)}\n`+
      `Received: ${Object.keys(implementation)}`)
    }

    //otherwise return true
    return true
  }

  /**
   * doLoad is the method that calls and awaits the async radpack module load.
   * It also ensures the controller initialization has been called and resolved before loading.
   * 
   * @async
   * @private
   * @return {Promise<Module>} 
   * @memberof HybridFederatedModule
   */
  async #doLoad() {
    if (!controllerInitialization) {
      throw new Error('Unable to load implementation, Federation controller must be initialized.')
    }
    // be sure that the controller initialization is complete before proceeding
    await controllerInitialization

    return await radpack(this.#moduleId)
  }

  
  /**
   * load is the public method should be called to load the async implementation for the extending class.
   * Once the load is resolved, the supplied definition will be validated and applied to the instance.
   * 
   * @async
   * @private
   * @return {Promise<Module>} 
   * @memberof HybridFederatedModule
   */
  async load(reload = false) {

    if (reload || !this.#loading) {
      // awaiting undefined is a noop, but if we are actively loading we want to wait for reload
      await this.#loading

      // assign the internal loading property to the doLoad promise
      this.#loading = this.#doLoad()

      // wait for it...
      const asyncModule = await this.#loading
      const implementation = asyncModule[this.#definitionProp]

      // apply implementation
      if (this.#isValidImplementation(implementation)) {
        Object.defineProperties(this, implementation) 
      }
    }

    // always return the whole async module
    return await this.#loading
  }
}
