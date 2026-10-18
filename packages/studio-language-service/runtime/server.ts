import { mkdir, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createPythonLanguageServer } from './http'
import { PythonLanguageSession } from './pyright'

const root = '/workspace/project'
await mkdir(root, { recursive: true, mode: 0o700 })
if ((await readdir(root)).length) throw new Error('Analysis requires an empty isolated workspace')
const session = new PythonLanguageSession({
  root,
  nodePath: process.execPath,
  serverPath: createRequire(import.meta.url).resolve('pyright/dist/pyright-langserver.js'),
})
const server = createPythonLanguageServer({
  token: process.env.PYTHON_LANGUAGE_TOKEN ?? '',
  session,
  onExpired: () => {
    process.exitCode = 0
  },
})
delete process.env.PYTHON_LANGUAGE_TOKEN
server.listen(8789, '0.0.0.0')
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    session.dispose()
    server.close()
    server.closeAllConnections()
  })
