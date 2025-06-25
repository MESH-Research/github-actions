import * as fs from 'fs/promises'
import * as core from '@actions/core'
import { FancyAnsi } from 'fancy-ansi'

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
      const summary = core.summary
        .addRaw(`<details><summary>${service} - ${output}</summary>`)
        .addEOL()
        .addEOL()

      await summaryProcessors[ext](fullPath, summary)

      summary.addEOL().addRaw('</details>').addEOL().addEOL()
    }
    await core.summary.write()
  }
}

const summaryProcessors = {
  txt: async function (
    file: string,
    summary: ReturnType<typeof core.summary.addRaw>
  ) {
    const fancyAnsi = new FancyAnsi()

    core.debug('Converting ANSI to HTML for file: ' + file)
    //Load file contents into variable
    const content = await fs.readFile(file)
    summary.addRaw(fancyAnsi.toHtml(content.toString()))
  },
  md: async function (
    file: string,
    summary: ReturnType<typeof core.summary.addRaw>
  ) {
    core.debug('Processing Markdown file: ' + file)
    summary.addRaw((await fs.readFile(file)).toString())
  }
}
