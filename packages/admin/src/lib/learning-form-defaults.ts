import type { InteractiveBlock, LearningActivity } from '@sistemazero/core/learning'
import { newProjectPlayActivity } from './project-play-authoring'
import { textoAoTrocarCena } from './scene-authoring-rules'

export function newLearningActivity(type: LearningActivity['type']): LearningActivity {
  switch (type) {
    case 'project-play':
      return newProjectPlayActivity()
    case 'experimentation':
      return { type, scene: 'world' }
    case 'html':
      return {
        type,
        html: "<h2>Experimente uma ideia</h2>\n<button onclick=\"learning.save({tests:(learning.state.tests||0)+1});learning.participated();this.textContent='Você fez '+learning.state.tests+' testes'\">Experimentar</button>",
      }
  }
}

/**
 * ⚠️ O bloco novo já nasce com o texto do modelo da cena padrão. Nascia em branco, e as regras
 * de troca só disparam numa TROCA — clicar no cartão já marcado não emite evento. Quem aceitava
 * o padrão escrevia tudo à mão e ainda levava o erro de campo obrigatório; quem clicava em
 * qualquer outra cena ganhava o texto de graça. O mesmo botão, dois comportamentos.
 */
export const EMPTY_LEARNING: InteractiveBlock = {
  kind: 'interactive',
  required: false,
  activity: newLearningActivity('experimentation'),
  ...textoAoTrocarCena({ title: '', instructions: '', hints: [] }, null, 'world'),
}
