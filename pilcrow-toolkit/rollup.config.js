import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

const config = {
  input: {
    pre: 'src/pre.ts',
    post: 'src/post.ts',
    main: 'src/main.ts'
  },
  output: {
    esModule: true,
    dir: 'dist',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    commonjs(),
    typescript(),
    nodeResolve({ preferBuiltins: true }),
    json()
  ]
}

export default config
