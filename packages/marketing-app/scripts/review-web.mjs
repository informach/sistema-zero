// Isolated review instance: separate port/build/profile, no changes to an existing server.

import { randomUUID } from 'node:crypto'
import { copyFile, cp, mkdir, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import next from 'next'

const native = process.argv.includes('--native-review')
const port = native ? 15334 : 15314
Object.assign(process.env, {
  GATEWAY_URL: `http://127.0.0.1:${native ? 15320 : 15300}`,
  JWT_HS256_SECRET: 'marketing-local-review-only-not-for-production-2026',
  JWT_ISSUER: 'sistemazero-auth',
  JWT_AUDIENCE: 'sistemazero',
})
const source = process.cwd(),
  root = path.resolve(`../../.cache/web-review-${randomUUID()}`),
  directory = path.join(root, 'packages/marketing-app')
await mkdir(directory, { recursive: true })
await cp(path.join(source, 'src'), path.join(directory, 'src'), {
  recursive: true,
  errorOnExist: true,
  force: false,
})
for (const name of ['public', 'node_modules'])
  await symlink(path.join(source, name), path.join(directory, name), 'junction')
// Preserve workspace-relative Tailwind sources, otherwise the isolated review silently omits
// shared dialog/workbench utilities and no longer represents the application's real layout.
for (const name of ['ui', 'marketing-workbench'])
  await symlink(path.resolve(source, '..', name), path.join(root, 'packages', name), 'junction')
await copyFile('package.json', path.join(directory, 'package.json'))
await copyFile('tsconfig.json', path.join(directory, 'tsconfig.json'))
await copyFile('postcss.config.mjs', path.join(directory, 'postcss.config.mjs'))
await writeFile(
  path.join(directory, 'next.config.mjs'),
  `import config from ${JSON.stringify(pathToFileURL(path.join(source, 'next.config.ts')).href)}; export default { ...config, distDir: '.next' };`,
)
const app = next({ dev: true, hostname: '127.0.0.1', port, dir: directory })
await app.prepare()
const server = createServer(app.getRequestHandler())
server.on('upgrade', app.getUpgradeHandler())
server.listen(port, '127.0.0.1', () =>
  console.log(`MARKETING_REVIEW_WEB_READY port=${port} directory=${directory}`),
)
