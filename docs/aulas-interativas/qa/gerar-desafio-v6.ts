import { resolve } from 'node:path'
import { earlyRecipes } from './desafio-aulas-00-02'
import { lateRecipes } from './desafio-aulas-03-05'
import { studioSettings } from './desafio-configuracao'
import { buildLesson, originalOf, scriptMarkdown } from './desafio-editorial'
import { experimentHtml, experiments } from './desafio-interacoes'
import { gravarGeracao } from './gravar-geracao'

export const desafioRecipes = { ...earlyRecipes, ...lateRecipes }

/** Os arquivos do Desafio como a receita os produz, pelo caminho relativo à pasta do curso. */
export function construirDesafio(source: string) {
  const arquivos: Array<[string, unknown]> = []
  const catalog = []
  for (const key of Object.keys(experiments) as Array<keyof typeof experiments>)
    arquivos.push([`interacoes/${key}.html`, experimentHtml(key)])
  for (let day = 0; day <= 5; day++) {
    const result = buildLesson(day, desafioRecipes[day]!, originalOf(source, day))
    const dir = result.manifest.lessonSlug
    if (day) arquivos.push([`${dir}/configuracao-estudio.json`, studioSettings(day)])
    arquivos.push(
      [`${dir}/roteiro.md`, scriptMarkdown(result)],
      [`${dir}/manifesto.json`, result.manifest],
      [`${dir}/montagem.json`, result.montage],
    )
    catalog.push({
      path: result.manifest.lessonSlug,
      title: result.manifest.title,
      sections: result.manifest.sections.length,
      clips: result.montage.clips.length,
      minutes: result.recipe.minutes,
    })
  }
  arquivos.push(['catalogo.json', catalog])
  return { arquivos, catalog }
}

if (import.meta.main) {
  const source = process.argv[2] ?? process.env.DESAFIO_ROTEIROS
  if (!source) throw new Error('Informe a pasta dos roteiros originais ou DESAFIO_ROTEIROS.')
  const root = resolve(import.meta.dir, '../desafio-primeiro-jogo-v6')
  const { arquivos, catalog } = construirDesafio(source)
  gravarGeracao(arquivos.map(([caminho, conteudo]) => [resolve(root, caminho), conteudo] as const))
  console.log(JSON.stringify(catalog, null, 2))
}
