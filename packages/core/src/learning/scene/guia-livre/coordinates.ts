import type { SceneState } from '../state'
import type { GuiaLivre } from './tipos'

/**
 * A experiência `coordinates` em exploração livre (Construtor, 02/11/2026): só a IDEIA (o x, o y e o
 * canto do 0, 0) e o convite à investigação. Antes do teste, a fala pergunta e diz o que observar; o
 * resultado só vem depois. As chaves das falas começam com `coordinates-`. Nada de bloco, regra, Se,
 * então nem senão.
 *
 * ⚠️ Os controles citados são os da tela livre (`scene-livre/coordinates.tsx`): os campos "x" e "y".
 * As falas são estáticas e falam da nave, o elenco da Primeira nave (o caso abre a nave no alto).
 */
const speech = {
  'coordinates-start':
    'A nave está no alto da tela. O que você acha que acontece se o x aumentar? Aumente só o x e observe para onde a nave vai. Se preferir, comece pelo y.',
  'coordinates-y':
    'Um x maior levou a nave para a direita. E o y? O que você acha que acontece se o y aumentar? Aumente só o y e observe a nave.',
  'coordinates-x':
    'Um y maior levou a nave para baixo. E o x? Aumente só o x e observe para onde a nave vai.',
  'coordinates-origin-first':
    'Você levou a nave para x 0 e y 0, o canto de cima, à esquerda. E se o x aumentar, para onde a nave vai? Aumente só o x e observe.',
  'coordinates-origin':
    'Um x maior levou a nave para a direita, e um y maior, para baixo. E onde fica o x 0 com o y 0? Diminua o x e o y até 0 e observe em que canto a nave fica.',
  'coordinates-complete':
    'O x 0 com o y 0 é o canto de cima, à esquerda. O x conta da esquerda para a direita, e o y conta de cima para baixo: por isso um y maior leva a nave para baixo. Pode continuar escolhendo lugares.',
} as const

export type FalaDoEndereco = keyof typeof speech

function guidance(_state: SceneState, has: (meta: string) => boolean): FalaDoEndereco {
  const direita = has('right'),
    baixo = has('down'),
    origem = has('origin')
  if (direita && baixo && origem) return 'coordinates-complete'
  if (direita && baixo) return 'coordinates-origin'
  if (direita) return 'coordinates-y'
  if (baixo) return 'coordinates-x'
  return origem ? 'coordinates-origin-first' : 'coordinates-start'
}

export const guia: GuiaLivre = { speech, guidance }
