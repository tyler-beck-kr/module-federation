import { initialize } from '@kroger/kap-federation-controller';
import a from '@kroger/kap-test-module-a'
import fetch from 'node-fetch'
import chalk from 'chalk';
import fs from 'fs-extra'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { readFile, readJSON, writeJSON } = fs

const keypress = async () => {
  process.stdin.setRawMode(true)
  return new Promise(resolve => process.stdin.once('data', () => {
    process.stdin.setRawMode(false)
    resolve()
  }))
}


//this is the application entry point
const demoApplication = async () => {

const getManifest = async () => {
  /**  load customized manifest from module server
   * Radpack does not currently pass through the fetch options
   * required to request a manifest via post with body. So our options are:
   * 1) Utilize application server to do something like we're doing below EG 
   *    fetch w/post, write to disk, register with file uri [annoying]
   * 2) Figure out how to pass resolved manifest object into register so we
   *    don't have to write to disk [less annoying, useful on client: should do anyway]
   * 3) Store/load application specific configureation on the ModuleServer [bad]
   * 4) PR to radpack to support fetch options through register.  This will allow us 
   *    to encapsulate the details of the initialization in the controller and 
   *    present a simpler isomorphic initialization to users [best]
   */ 
  const response = await fetch('http://localhost:3000/federation/manifest', {
    method: 'post',
    body: JSON.stringify({
      '@kroger/kap-test-module-a': 'stable',
      '@kroger/kap-test-module-b': 'latest'
    }),
    headers: {'Content-Type': 'application/json'}
  })
  const manifest = await response.json()
  await writeJSON('./radpack.json', manifest)

  return manifest
}


const register = async () => {
  // initialize with the file we just created.  This will register the 
  // configuration with radpack and enable us to load the specified implementations.
  await initialize({
    manifestUri: './radpack.json',
    moduleRegistry: 'http://localhost:3000'
  })
}

  // This was getting repetative so... array iteration time!
  const demoSteps = [
    {
      title: `initialize manifest`,
      fn: async () => await getManifest()
    },
    {
      title: `register manifest with federation controller`,
      fn: async () => await register()
    },
    {
      title: `call a function that has been defined statically`,
      fn: () => a.status()
    },
    {
      title: `let's see what happens when I call an asynchronously defined method on "a"`,
      fn: () => a.getMessage()
    },
    {
      title: `let's see what happens when I set a member of "a"`,
      fn: () => { a.message = "foo" }
    },
    {
      title: `time to load a's async implementation`,
      fn: async () => await a.load()
    },
    {
      title: `call a function with an overriden implementation`,
      fn: () => a.status()
    },
    {
      title: `let's see what happens when I call a method on "a"`,
      fn:() => a.getMessage()
    },
    {
      title: `let's see what happens when I set a member of "a"`,
      fn: () => { a.message = "a new message" }
    },
    {
      title: `lets get the message one more time`,
      fn:() => a.getMessage()
    }
  ]

  // iterate through the demo steps waiting for key press before each result and after each step.
  // note: the await keypress effectively kills the ability to break out of this app, so it's all or nothing!
  let i = 0
  let length = demoSteps.length
  for (const { title, fn } of demoSteps ) {
    // where are we in the process? 
    console.log(chalk.green(`[step ${++i} of ${length}]`))
    // what's the point?
    console.log(chalk.cyan(title))
    // what's going to happen?
    console.log(chalk.grey(fn.toString()))
    await keypress()
    // give it a go...
    try {
      console.log(`Result: ${JSON.stringify((await fn()), undefined , "  ")}`)
    } catch (e) {
      //ruh roh
      console.log("We caught an error:", e)
    }

    if (i < length){

      //its over don't make me press another key!
      await keypress()
      console.log("")
    }
  }
 }


// run it.
await demoApplication()
process.exit(0)

