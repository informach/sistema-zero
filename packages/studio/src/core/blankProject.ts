import { STUDIO_PROJECT_FORMAT_VERSION } from '@sistemazero/core/studio/project-format'

/** Browser-independent document factory, also used by the live workspace service. */
export function createBlankProjectSnapshot(id: string, name: string) {
  const now = Date.now()
  const title = name
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return {
    formatVersion: STUDIO_PROJECT_FORMAT_VERSION,
    projectTools: [],
    id,
    name,
    createdAt: now,
    updatedAt: now,
    mode: 'blocks' as const,
    files: {
      'index.html': `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <script src="script.js"></script>
  </body>
</html>
`,
      'style.css': '',
      'script.js': '',
    },
    extraFiles: [],
    assets: [],
    ir: {
      version: 2 as const,
      html: [],
      css: [],
      behavior: { start: [], events: [], loops: [] },
      extensions: [],
    },
    blocksState: { blocks: { languageVersion: 0, blocks: [] } },
    installedExtensions: [],
  }
}
