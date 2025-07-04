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
    const onlyFiles = files.filter((f) => f.isFile())

    const fileStats = await Promise.all(
      onlyFiles.map((f) => fs.stat(path.join(dir, f.name)))
    )
    const onlyFilesOutput = onlyFiles.join(', ')
    const sizes = fileStats.map((s) => s.size).join(', ')
    core.debug(`Found Files: ${onlyFilesOutput} with sizes: ${sizes}`)
    const nonEmptyFiles = onlyFiles.filter((f, idx) => fileStats[idx].size > 0)
    const hasStdErr = nonEmptyFiles.some((f) => f.name.includes('stderr'))

    if (hasStdErr) {
      core.warning(`${path.basename(dir)} wrote to stderr.  Check logs.`)
      core.summary.addRaw(
        '| :warning:     | This build step wrote to stderr during execution.  Check below for errors/warnings. |',
        true
      )
      core.summary.addRaw(
        '|---------------|:------------------------------------------------------------------------------|',
        true
      )
    }
    if (nonEmptyFiles.length === 0) {
      core.debug('No files found in directory: ' + dir)
      continue
    }
    for (const file of nonEmptyFiles) {
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
    const content = (await fs.readFile(file)).toString()

    core.summary.addRaw(
      `<details><summary>${service} - ${output}</summary>`,
      true
    )
    core.summary.addRaw('<pre>', true)
    core.summary.addRaw(fancyAnsi.toHtml(content), true)
    core.summary.addRaw('</pre>', true)
    core.summary.addRaw('</details>', true)
  },
  md: async function (file: string) {
    core.debug('Processing Markdown file: ' + file)

    core.summary.addRaw('<details><summary>Markdown Output</summary>', true)
    core.summary.addRaw((await fs.readFile(file)).toString())
    core.summary.addRaw('</details>', true)
  }
}
