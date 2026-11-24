import { fileURLToPath } from 'node:url'
import { build, type PreviewServer, preview } from 'vite'

export async function startWorkspaceFixture(): Promise<PreviewServer> {
  const configFile = fileURLToPath(new URL('../../playground/vite.config.ts', import.meta.url))
  const root = fileURLToPath(new URL('../fixtures/pro-workspace', import.meta.url))
  const outDir = fileURLToPath(new URL('../../.cache/e2e-pro-workspace', import.meta.url))
  await build({
    configFile,
    root,
    logLevel: 'warn',
    build: { outDir, emptyOutDir: true, target: 'esnext' },
  })
  return preview({
    configFile,
    root,
    build: { outDir },
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
  })
}

export async function stopWorkspaceFixture(server: PreviewServer | undefined): Promise<void> {
  if (server)
    await new Promise<void>((resolve, reject) => {
      server.httpServer.close((error) => (error ? reject(error) : resolve()))
    })
}
