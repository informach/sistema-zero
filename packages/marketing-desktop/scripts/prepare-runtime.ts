import { createRequire } from 'node:module'
import { FuseV1Options, FuseVersion, flipFuses } from '@electron/fuses'

const require = createRequire(import.meta.url)
const binary: unknown = require('electron')
if (typeof binary !== 'string') throw new Error('Binário Electron ausente')
// Development runtime must protect cookies too. Distribution applies the same
// fuses before code signing; it also enforces the packaged ASAR boundary.
await flipFuses(binary, {
  version: FuseVersion.V1,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
})
console.log('Runtime local com cookies criptografados e depuração externa desativada.')
