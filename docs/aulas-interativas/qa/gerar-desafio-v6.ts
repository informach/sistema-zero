import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { earlyRecipes } from './desafio-aulas-00-02'
import { lateRecipes } from './desafio-aulas-03-05'
import { studioSettings } from './desafio-configuracao'
import { buildLesson, originalOf, scriptMarkdown } from './desafio-editorial'
import { experimentHtml, experiments } from './desafio-interacoes'

const source = process.argv[2] ?? process.env.DESAFIO_ROTEIROS
if (!source) throw new Error('Informe a pasta dos roteiros originais ou DESAFIO_ROTEIROS.')
const root = resolve(import.meta.dir, '../desafio-primeiro-jogo-v6')
const recipes = { ...earlyRecipes, ...lateRecipes }
const catalog = []
mkdirSync(resolve(root, 'interacoes'), { recursive: true })
for (const key of Object.keys(experiments) as Array<keyof typeof experiments>)
  writeFileSync(resolve(root, 'interacoes', `${key}.html`), experimentHtml(key))
for (let day = 0; day <= 5; day++) {
  const result = buildLesson(day, recipes[day]!, originalOf(source, day))
  const dir = resolve(root, result.manifest.lessonSlug)
  mkdirSync(dir, { recursive: true })
  if (day)
    writeFileSync(
      resolve(dir, 'configuracao-estudio.json'),
      `${JSON.stringify(studioSettings(day), null, 2)}\n`,
    )
  writeFileSync(resolve(dir, 'roteiro.md'), scriptMarkdown(result))
  writeFileSync(resolve(dir, 'manifesto.json'), `${JSON.stringify(result.manifest, null, 2)}\n`)
  writeFileSync(resolve(dir, 'montagem.json'), `${JSON.stringify(result.montage, null, 2)}\n`)
  catalog.push({
    path: result.manifest.lessonSlug,
    title: result.manifest.title,
    sections: result.manifest.sections.length,
    clips: result.montage.clips.length,
    minutes: result.recipe.minutes,
  })
}
writeFileSync(resolve(root, 'catalogo.json'), `${JSON.stringify(catalog, null, 2)}\n`)
console.log(JSON.stringify(catalog, null, 2))
