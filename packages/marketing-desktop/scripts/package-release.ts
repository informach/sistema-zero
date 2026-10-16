import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { releaseConfiguration } from './release-config'

if (process.platform !== 'win32')
  throw new Error('A distribuição validada desta versão é Windows x64.')
const config = releaseConfiguration(process.env, true)
if (!config) throw new Error('Configuração de distribuição ausente.')
if (!process.env.CSC_LINK && !process.env.WIN_CSC_LINK && !process.env.MARKETING_SIGNING_SUBJECT)
  throw new Error(
    'Configure um certificado de assinatura real ou MARKETING_SIGNING_SUBJECT do repositório de certificados do Windows.',
  )
await mkdir('.cache', { recursive: true })
const builderFile = path.resolve('.cache/release-builder.json')
await writeFile(
  builderFile,
  JSON.stringify(
    {
      extends: path.resolve('electron-builder.yml'),
      forceCodeSigning: true,
      win: {
        target: ['nsis'],
        publisherName: config.publisherNames,
        verifyUpdateCodeSignature: true,
        ...(process.env.MARKETING_SIGNING_SUBJECT
          ? { certificateSubjectName: process.env.MARKETING_SIGNING_SUBJECT }
          : {}),
      },
      publish: [{ provider: 'generic', url: config.feedUrl }],
    },
    null,
    2,
  ),
)
for (const args of [
  ['bun', 'run', 'build'],
  ['bunx', 'electron-builder', '--win', '--x64', '--config', builderFile, '--publish', 'never'],
]) {
  const child = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' })
  const code = await child.exited
  if (code) process.exit(code)
}
