import { getInputs } from './lib/config.js'
import { run } from './action.js'

console.log(process.env)

run('main', getInputs())
