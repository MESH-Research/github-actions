import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import dynamicImportVars from '@rollup/plugin-dynamic-import-vars'

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
    dynamicImportVars(),
    typescript(),
    nodeResolve({ preferBuiltins: true }),
    commonjs()
  ]
}

export default config
