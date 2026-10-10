import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { montarProjetoCadeTodoMundoCompleto } from '../../../../docs/aulas-interativas/qa/cade-todo-mundo-projeto'
import { projetoDino } from '../../../../docs/aulas-interativas/qa/corre-dino-etapas'
import { montarProjetoFarol } from '../../../../docs/aulas-interativas/qa/desafio-farol-projeto'
import { projetoNave } from '../../../../docs/aulas-interativas/qa/nave-contra-asteroides-etapas'
import { renderProjectToPreviewDocAsync } from '../../../../packages/studio/src/preview/renderProject'

const work = resolve(import.meta.dir)
for (const folder of ['capturas', 'jogos', 'finais'])
  mkdirSync(resolve(work, folder), { recursive: true })
const projects = {
  farol: montarProjetoFarol('concluido'),
  cade: montarProjetoCadeTodoMundoCompleto(),
  nave: projetoNave(9),
  dino: projetoDino(13),
}
for (const [key, project] of Object.entries(projects)) {
  project.id = `instagram-projetos-${key}`
  writeFileSync(resolve(work, 'jogos', `${key}.json`), JSON.stringify(project))
  writeFileSync(
    resolve(work, 'jogos', `${key}.html`),
    await renderProjectToPreviewDocAsync(project),
  )
}
console.log(JSON.stringify({ work, projects: Object.keys(projects) }))
