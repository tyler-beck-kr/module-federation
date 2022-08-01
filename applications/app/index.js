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


const bootstrap = async () => {
  // initialization -----------------------------------------------------------
  // load customized manifest from module server
  const response = await fetch('http://localhost:3000/federation/manifest', {
    method: 'post',
    body: JSON.stringify({
      '@kroger/kap-test-module-a': 'stable',
      '@kroger/kap-test-module-b': 'latest'
    }),
    headers: {'Content-Type': 'application/json'}
  })
  const manifest = await response.json()

  // write object to a file for testing... 
  // TODO: need to determine how to pass an already loaded object to register
  await writeJSON('./radpack.json', manifest)

  //initialize with the file we just created 
  await initialize({
    manifest: './radpack.json',
    moduleRegistry: 'http://localhost:3000'
  })


  console.log(a.status())

  const demoSteps = [
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
      title: `call a function with a overriden implementation`,
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

  let i = 0
  let length = demoSteps.length
  for (const { title, fn } of demoSteps ) {
    console.log(chalk.green(`[step ${++i} of ${length}]`))
    console.log(chalk.cyan(title))
    console.log(chalk.grey(fn.toString()))
    await keypress()
    try {
      console.log(`Result: ${JSON.stringify((await fn()), undefined , "  ")}`)
    } catch (e) {
      console.log("We caught an error:", e)
    }
    await keypress()
    console.log("\n\n")
  }

  
  process.exit(0) 
 }

await bootstrap()

