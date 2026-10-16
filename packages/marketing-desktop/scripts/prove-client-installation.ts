import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { z } from 'zod'
import { nativeEnvironment } from '../src/main/native-client'

if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Prova Windows x64')
const require = createRequire(import.meta.url)
const electron: unknown = require('electron')
if (typeof electron !== 'string') throw new Error('Electron não instalado')
const reopen = process.argv.find((arg) => arg.startsWith('--reopen='))?.slice('--reopen='.length)
const id = reopen ? z.string().uuid().parse(reopen) : randomUUID()
const root = path.resolve('.cache/client-install-proof', id, 'isolated-home')
await mkdir(path.join(root, 'AppData/Roaming'), { recursive: true })
await mkdir(path.join(root, 'AppData/Local'), { recursive: true })
const systemRoot = process.env.SystemRoot
if (!systemRoot) throw new Error('Windows não identificado')
const env = {
  ...Object.fromEntries(
    Object.entries(nativeEnvironment()).filter(
      ([key]) =>
        !['path', 'home', 'userprofile', 'appdata', 'localappdata'].includes(key.toLowerCase()),
    ),
  ),
  USERPROFILE: root,
  HOME: root,
  APPDATA: path.join(root, 'AppData/Roaming'),
  LOCALAPPDATA: path.join(root, 'AppData/Local'),
  PATH: `${path.join(systemRoot, 'System32')};${systemRoot}`,
}
for (const args of reopen
  ? [['--smoke-client-install', '--client-install-reopen']]
  : [['--smoke-client-install'], ['--smoke-client-install', '--client-install-reopen']]) {
  const child = Bun.spawn([electron, '.', ...args, `--client-install-id=${id}`], {
    env,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await child.exited
  if (code) process.exit(code)
}
