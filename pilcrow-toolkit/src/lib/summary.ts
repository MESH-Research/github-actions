import * as fs from 'fs/promises'
import * as core from '@actions/core'
import { FancyAnsi } from 'fancy-ansi'
import path from 'path'

//import { AnsiUp } from 'ansi_up'

type OutputDetails = {
  service: string
  output: string
  ext: SupportedExtensions
}

type SupportedExtensions = keyof typeof summaryProcessors

export async function generateSummary(paths: string[]) {
  for (const dir of paths) {
    core.debug('Processing directory: ' + dir)
    const files = await fs.readdir(dir, { withFileTypes: true })
    const hasStdErr = files.some((f) => f.name.includes('stderr'))

    if (hasStdErr) {
      core.warning(`${path.dirname(dir)} wrote to stderr.  Check logs.`)
      core.summary.addRaw(
        '| :warning:     | The build wrote to stderr during execution.  Check below for errors/warnings. |',
        true
      )
      core.summary.addRaw(
        '|---------------|:------------------------------------------------------------------------------|',
        true
      )
    }
    if (files.length === 0) {
      core.debug('No files found in directory: ' + dir)
      continue
    }
    for (const file of files) {
      if (!file.isFile()) {
        core.debug('Skipping non-file: ' + file.name)
        continue
      }
      const fullPath = `${dir}/${file.name}`

      const outputDetails =
        /(?<service>[^/]+)\/(?<output>[^/]+)\.(?<ext>[^.]+)$/.exec(fullPath)
          ?.groups ?? { service: null, output: null, ext: null }
      if (
        !outputDetails.service ||
        !outputDetails.output ||
        !outputDetails.ext
      ) {
        core.debug('Skipping file with unexpected name: ' + file.name)
        continue
      }
      if (!(outputDetails.ext in summaryProcessors)) {
        core.debug('Skipping file with unsupported extension: ' + file.name)
        continue
      }
      const { service, output, ext } = outputDetails as OutputDetails

      core.info(
        `📝 Processing file - svc: ${service}, output: ${output}, format: ${ext}`
      )
      await summaryProcessors[ext](fullPath, outputDetails as OutputDetails)
    }
    await core.summary.write()
  }
}

const summaryProcessors = {
  txt: async function (file: string, { service, output }: OutputDetails) {
    const fancyAnsi = new FancyAnsi()

    core.debug('Converting ANSI to HTML for file: ' + file)
    const content = await fs.readFile(file)
    const { addRaw } = core.summary
    addRaw(`<details><summary>${service} - ${output}</summary>`, true)
    addRaw('<pre>', true)
    addRaw(fancyAnsi.toHtml(content.toString()), true)
    addRaw('</pre>', true)
    addRaw('</details>', true)
  },
  md: async function (file: string) {
    core.debug('Processing Markdown file: ' + file)
    const { addRaw } = core.summary
    addRaw('<details><summary>Markdown Output</summary>', true)
    addRaw((await fs.readFile(file)).toString())
    addRaw('</details>', true)
  }
}
