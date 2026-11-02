'use client'

import {
  FOLHA_DA_NAVE,
  type SceneSheet,
  SHEET_CROP_WIDTHS,
  sheetCropCell,
  TAMANHO_PARECIDO,
} from '@sistemazero/core/learning/scene'
import { Crop, Maximize2, Scissors, SquareDashed } from 'lucide-react'
import { SheetStage } from '../scene-atelie-stages'
import { Frame } from '../scene-discovery-frame'
import { DicaLivre, EscolhaLivre, FaixaLivre, IdeiaRevelada, useTelaLivre } from './meu-jeito-e'

/**
 * A experiência `sheet-vs-sprite` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de `Door`,
 * `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`).
 *
 * ⚠️ Exceção decidida pela responsável (02/11/2026): na Aula 6 o conceito É o recorte da folha × o sprite,
 * então "recorte", "folha" e "quadro da folha" ficam. O que cada recorte mostra só aparece na figura
 * depois de testado, e o tamanho no jogo abre só com uma nave inteira à vista (`size-apart` depois de
 * `crop-whole`, régua do motor).
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DA_FOLHA = ['squeezed', 'crop-half', 'crop-whole', 'size-apart'] as const
const OBJETIVOS_DA_FOLHA = [
  'Escolha o recorte de 64 e observe o jogo.',
  'Escolha o recorte de 16 e observe o jogo.',
  'Ache o recorte que mostra uma nave inteira.',
  'Com uma nave inteira no jogo, deixe a nave bem maior ou bem menor e observe a folha.',
]
/** Os tamanhos no jogo: dois bem longe do de fábrica (fora de `TAMANHO_PARECIDO`) e o de fábrica. */
export const TAMANHOS_DA_NAVE = [
  { id: 24, rotulo: 'Bem menor (24 por 24)' },
  { id: 54, rotulo: 'Como no começo (54 por 54)' },
  { id: 88, rotulo: 'Bem maior (88 por 88)' },
] as const
type Tamanho = (typeof TAMANHOS_DA_NAVE)[number]['id']

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDaFolha =
  | { gesto: 'recorte'; largura: number }
  | { gesto: 'tamanho'; tamanho: Tamanho }
  | null
export function proximoGestoDaFolha(fala: string | undefined, s: SceneSheet): GestoDaFolha {
  if (!fala) return null
  if (fala === 'sheet-vs-sprite-size') {
    if (!s.loaded || s.width !== FOLHA_DA_NAVE.quadro)
      return { gesto: 'recorte', largura: FOLHA_DA_NAVE.quadro }
    return { gesto: 'tamanho', tamanho: s.size > TAMANHO_PARECIDO.max ? 24 : 88 }
  }
  // `sheet-vs-sprite-start-<pedida>` e `sheet-vs-sprite-<vista>-<pedida>`: o gesto é a largura pedida.
  const pedida = /^sheet-vs-sprite-(?:start|\d+)-(\d+)$/.exec(fala)?.[1]
  return pedida ? { gesto: 'recorte', largura: Number(pedida) } : null
}

export function LivreSheetVsSprite() {
  const { activity, state, dispatch, instruction, has, fala } = useTelaLivre()
  const s = state.sheet
  const completed = METAS_DA_FOLHA.map(has)
  const g = proximoGestoDaFolha(fala, s)
  const umQuadro = s.loaded && s.width === FOLHA_DA_NAVE.quadro
  const naveInteira = completed[2] ?? false
  return (
    <Frame
      title="A folha e o tamanho no jogo"
      kind="folha"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DA_FOLHA}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <FaixaLivre
          itens={[
            ['Recorte', s.loaded ? `${s.width} por 32` : 'nenhum'],
            ['Nave no jogo', `${s.size} por ${s.size}`],
          ]}
        />
      }
      stage={<SheetStage state={state} cast={activity.cast} />}
      after={
        <IdeiaRevelada
          titulo="O que o jogo mostra"
          casos={[
            {
              gesto: 'Recorte de 64',
              resposta: 'A folha inteira, com as duas naves espremidas',
              visto: completed[0] ?? false,
              icone: <Maximize2 size={20} />,
            },
            {
              gesto: 'Recorte de 16',
              resposta: 'Metade de uma nave, esticada',
              visto: completed[1] ?? false,
              icone: <Scissors size={20} />,
            },
            {
              gesto: 'Recorte de 32',
              resposta: 'Uma nave inteira: um quadro da folha',
              visto: completed[2] ?? false,
              icone: <Crop size={20} />,
            },
            {
              gesto: 'Tamanho no jogo',
              resposta: 'A nave do jogo muda; a folha continua igual',
              visto: completed[3] ?? false,
              icone: <SquareDashed size={20} />,
            },
          ]}
        />
      }
    >
      <EscolhaLivre<number>
        legenda="Largura do recorte (a altura fica 32)"
        valor={s.loaded ? s.width : null}
        gesto={g?.gesto === 'recorte' ? g.largura : null}
        opcoes={SHEET_CROP_WIDTHS.map((w) => ({ id: w as number, rotulo: `Recorte de ${w}` }))}
        onEscolher={(width) => dispatch({ type: 'crop', width })}
      />
      <EscolhaLivre<number>
        legenda="Quadro do recorte"
        valor={umQuadro ? sheetCropCell(s.cell, s.width) : null}
        fechado={!umQuadro}
        nota={umQuadro ? undefined : 'Abre com o recorte de 32.'}
        opcoes={[
          { id: 1, rotulo: 'Quadro 1' },
          { id: 2, rotulo: 'Quadro 2' },
        ]}
        onEscolher={(cell) => dispatch({ type: 'cut', cell })}
      />
      <EscolhaLivre<Tamanho>
        legenda="Tamanho da nave no jogo"
        valor={(TAMANHOS_DA_NAVE.find((t) => t.id === s.size)?.id ?? null) as Tamanho | null}
        gesto={g?.gesto === 'tamanho' ? g.tamanho : null}
        fechado={!naveInteira}
        nota={
          naveInteira
            ? undefined
            : 'Abre depois que você achar o recorte que mostra uma nave inteira.'
        }
        opcoes={TAMANHOS_DA_NAVE.map((t) => ({ id: t.id, rotulo: t.rotulo }))}
        onEscolher={(size) => dispatch({ type: 'sprite', size })}
      />
      <DicaLivre />
    </Frame>
  )
}
