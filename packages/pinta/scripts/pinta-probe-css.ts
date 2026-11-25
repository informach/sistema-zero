import { resolve } from 'node:path'
import { build } from 'vite'

/** Use the real consumer Tailwind pipeline, including the Pinta source classes. */
export async function buildPintaProbeCss(): Promise<string> {
  const root = resolve(import.meta.dirname, '..')
  const result = await build({
    configFile: resolve(root, 'playground/vite.config.ts'),
    logLevel: 'error',
    build: {
      write: false,
      minify: false,
      rolldownOptions: { input: resolve(root, 'playground/styles.css') },
    },
  })
  if (Array.isArray(result) || !('output' in result)) throw new Error('Pinta CSS build missing.')
  const css = result.output.filter(
    (entry) => entry.type === 'asset' && entry.fileName.endsWith('.css'),
  )
  if (css.length !== 1 || css[0]?.type !== 'asset') throw new Error('Pinta CSS output missing.')
  return typeof css[0].source === 'string'
    ? css[0].source
    : Buffer.from(css[0].source).toString('utf8')
}
