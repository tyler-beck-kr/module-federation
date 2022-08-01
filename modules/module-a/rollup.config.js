import resolve from '@rollup/plugin-node-resolve'
import radpack from '@radpack/rollup-plugin'

export default [
  {
    input: './src/implementation.js',
    output: {
      dir: './dist/radpack',
    },
    plugins: [
      resolve({
        preferBuiltins: true,
       }),
      radpack({ 
        // register: 'http://localhost:3000/radpack/manifest/latest/@kroger/kap-test-module-a',
      })
    ],
  },
]
