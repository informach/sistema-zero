/** Vocabulário real do Palco + gestos de página documentados na ESPEC-ROTEIRO §9. */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { agir } from '../../../../packages/palco-gravacao/src/lib/verbos'
import { config2D } from '../../qa/construtor-2d'
import { config3D } from '../../qa/construtor-3d'

// A camada EdiAula processa estes comandos antes de chamar o Palco.
const pageGestures = [
  /^(?:clicar|apontar|passar o mouse|clique duplo|clique direito) ["“][^"”]+["”]$/i,
  /^digitar ["“][^"”]*["”] em ["“][^"”]+["”]$/i,
  /^tecla (?:[A-Za-z][A-Za-z0-9+_-]*|[0-9])$/i,
  /^segurar tecla [A-Za-z][A-Za-z0-9+_-]* por \d+(?:[.,]\d+)? s$/i,
  /^segurar ["“][^"”]+["”] por \d+(?:[.,]\d+)? s$/i,
  /^esperar ["“][^"”]+["”](?: sumir)?$/i,
  /^rolar (?:até ["“][^"”]+["”]|para baixo)$/i,
  /^arrastar ["“][^"”]+["”] para ["“][^"”]+["”]$/i,
  /^na edição: .+$/i,
]
const reports = []
for (const config of [config2D, config3D]) {
  let count = 0
  let page = 0
  const unknown: { lesson: string; part: string; gesture: string; error: string }[] = []
  for (const lesson of config.aulas)
    for (const part of lesson.trechos) {
      for (const match of part.screen.matchAll(/\[([^\]\n]+)\]/g)) {
        const gesture = match[1]!
        count++
        if (pageGestures.some((pattern) => pattern.test(gesture))) {
          page++
          continue
        }
        try {
          agir(gesture, [
            { stage: config.jogoPronto.palco ?? { width: 960, height: 600 }, targets: [] },
          ])
        } catch (error) {
          const message = String((error as Error).message)
          // São gestos reconhecidos, que o ensaio com página real deverá resolver.
          if (
            message === 'Este gesto precisa da página do palco aberta.' ||
            message.startsWith('A pré-visualização do Estúdio não está na tela.')
          )
            continue
          unknown.push({ lesson: lesson.slug, part: part.key, gesture, error: message })
        }
      }
    }
  reports.push({
    course: config.curso,
    count,
    pageGestures: page,
    nativeGestures: count - page,
    unknown,
  })
}
const report = {
  scope:
    'Sintaxe dos gestos, parser oficial do Palco e verbos de página da ESPEC. Alvos dinâmicos, foco, tempos, enquadramento e execução exigem Verificar plano no Estúdio; não foram declarados executados por este gate.',
  courses: reports,
}
const target = resolve(import.meta.dir, '../../qa/relatorios/construtor-base-gestos.json')
mkdirSync(resolve(target, '..'), { recursive: true })
writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  JSON.stringify(
    reports.map(({ course, count, unknown }) => ({ course, count, unknown })),
    null,
    2,
  ),
)
assert(
  reports.every((report) => report.unknown.length === 0),
  'Há gestos sem contrato reconhecido',
)
