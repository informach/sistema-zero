import { readFile } from 'node:fs/promises'
import { lintLightCopy } from '../../../../packages/marketing/src/domain/copy/light-copy'

export { lintLightCopy }

// Texto comercial limpo. Não extrai strings de TSX/Astro nem interpreta Markdown.
if (import.meta.main) {
  const files = process.argv.slice(2)
  if (files.length === 0) {
    console.error('Uso: bun check-copy.ts <arquivo-de-copy> [outro-arquivo]')
    process.exitCode = 2
  } else {
    const reports = []
    let exitCode = 0
    for (const file of files) {
      try {
        const issues = lintLightCopy(await readFile(file, 'utf8'))
        reports.push({ file, issues, scope: 'Regras mecânicas; exige revisão editorial e de provas.' })
        if (issues.length) exitCode = Math.max(exitCode, 1)
      } catch {
        reports.push({ file, error: 'Não foi possível ler o arquivo para revisão.' })
        exitCode = 2
      }
    }
    console.log(JSON.stringify(reports, null, 2))
    process.exitCode = exitCode
  }
}
