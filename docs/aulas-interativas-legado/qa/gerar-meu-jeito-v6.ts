import { resolve } from 'node:path'
import { gravarGeracao } from './gravar-geracao'
import { earlyRecipes } from './meu-jeito-aulas-01-04'
import { lateRecipes } from './meu-jeito-aulas-05-08'
import { buildLesson, originalOf, scriptMarkdown } from './meu-jeito-editorial'
import { experimentDefinitions, experimentHtml } from './meu-jeito-interacoes'

export const meuJeitoRecipes = { ...earlyRecipes, ...lateRecipes }

/** Os arquivos de O Jogo do Meu Jeito como a receita os produz, pelo caminho relativo à pasta do curso. */
export function construirMeuJeito(sourceDirectory: string) {
  const arquivos: Array<[string, unknown]> = []
  for (const key of Object.keys(experimentDefinitions) as Array<keyof typeof experimentDefinitions>)
    arquivos.push([`interacoes/${key}.html`, `${experimentHtml(key)}\n`])
  const catalog = []
  for (let lesson = 1; lesson <= 8; lesson++) {
    const recipe = meuJeitoRecipes[lesson]!
    const result = buildLesson(lesson, recipe, originalOf(sourceDirectory, lesson))
    const path = result.manifest.lessonSlug
    arquivos.push(
      [`${path}/manifesto.json`, result.manifest],
      [`${path}/montagem.json`, result.montage],
      [`${path}/roteiro.md`, scriptMarkdown(result)],
    )
    catalog.push({
      path,
      title: result.manifest.title,
      source: result.montage.sourceFile,
      sourceHash: result.montage.sourceHash,
      sections: result.manifest.sections.length,
      clips: result.montage.clips.length,
      demonstrations: result.manifest.sections.filter((s) => s.intent === 'demonstration').length,
      experiments: result.manifest.sections.filter((s) => s.intent === 'exploration').length,
      gallery: {
        kind: recipe.tool === 'pinta' ? 'pinta' : 'studio',
        minItems: lesson === 5 ? 2 : 1,
        maxItems: lesson === 5 ? 2 : 1,
      },
    })
  }
  arquivos.push(['catalogo.json', catalog])
  return { arquivos, catalog }
}

if (import.meta.main) {
  const sourceDirectory = process.argv[2] ?? process.env.MEU_JEITO_ROTEIROS
  if (!sourceDirectory)
    throw new Error(
      'Informe a pasta dos oito roteiros originais como primeiro argumento ou MEU_JEITO_ROTEIROS.',
    )
  const root = resolve(import.meta.dir, '../o-jogo-do-meu-jeito-v6')
  const { arquivos, catalog } = construirMeuJeito(sourceDirectory)
  gravarGeracao(arquivos.map(([caminho, conteudo]) => [resolve(root, caminho), conteudo] as const))
  console.log(
    JSON.stringify({
      lessons: catalog.length,
      sections: catalog.reduce((n, c) => n + c.sections, 0),
      clips: catalog.reduce((n, c) => n + c.clips, 0),
      demonstrations: catalog.reduce((n, c) => n + c.demonstrations, 0),
      experiments: catalog.reduce((n, c) => n + c.experiments, 0),
    }),
  )
}
