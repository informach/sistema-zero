'use client'

import type { SceneCopies, SceneCopyColor } from '@sistemazero/core/learning/scene'
import { Download, FolderInput, Paintbrush } from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { CopyVsOriginalStage } from '../scene-copies'
import { Frame, SceneButton } from '../scene-discovery-frame'
import { DicaLivre, EscolhaLivre, FaixaLivre, IdeiaRevelada, useTelaLivre } from './meu-jeito-e'

/**
 * A experiência `copy-vs-original` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de `Door`,
 * `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`).
 *
 * A ideia: baixar o projeto tira uma CÓPIA, importar a transforma num projeto seu, e daí em diante cada
 * um segue o seu caminho. "Baixar o projeto" e "Importar" são as ações da plataforma (a ferramenta). O
 * que cada gesto faz só aparece na figura depois de a criança testar.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DA_COPIA = ['exported', 'imported', 'independent'] as const
const OBJETIVOS_DA_COPIA = [
  'Baixe o projeto e observe o jogo da aula.',
  'Importe o arquivo e compare o Estúdio com a aula.',
  'Pinte a nave de um lado só e observe o outro lado.',
]
const CORES: SceneCopyColor[] = ['azul', 'rosa', 'verde', 'laranja']

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDaCopia =
  | { gesto: 'baixar' | 'importar' }
  | { gesto: 'pintar'; cor: SceneCopyColor }
  | null
export function proximoGestoDaCopia(fala: string | undefined, c: SceneCopies): GestoDaCopia {
  switch (fala) {
    case 'copy-vs-original-start':
      return { gesto: 'baixar' }
    case 'copy-vs-original-exported':
      return c.fileColor === null ? { gesto: 'baixar' } : { gesto: 'importar' }
    case 'copy-vs-original-imported': {
      if (c.studioColor === null) return { gesto: 'importar' }
      // Uma cor da nave do Estúdio diferente da nave da aula: é o lado pintado que mostra a diferença.
      const cor = CORES.find((x) => x !== c.lessonColor && x !== c.studioColor) ?? 'rosa'
      return { gesto: 'pintar', cor }
    }
    default:
      return null
  }
}

export function LivreCopyVsOriginal() {
  const { activity, state, dispatch, instruction, has, fala } = useTelaLivre()
  const c = state.copies
  const completed = METAS_DA_COPIA.map(has)
  const g = proximoGestoDaCopia(fala, c)
  const tom = (qual: 'baixar' | 'importar') => (g?.gesto === qual ? 'gesto' : 'ferramenta')
  return (
    <Frame
      title="A cópia e o original"
      kind="copia"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DA_COPIA}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <FaixaLivre
          itens={[
            ['Nave da aula', c.lessonColor],
            ['Arquivo', c.fileColor ? 'baixado' : 'nenhum'],
            ['Nave do Estúdio', c.studioColor ?? 'sem projeto'],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <CopyVsOriginalStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaRevelada
          titulo="O que acontece com o jogo"
          casos={[
            {
              gesto: 'Baixar o projeto',
              resposta: 'Sai um arquivo com uma cópia; o jogo continua na aula',
              visto: completed[0] ?? false,
              icone: <Download size={20} />,
            },
            {
              gesto: 'Importar no Estúdio',
              resposta: 'A cópia vira um projeto seu no Estúdio',
              visto: completed[1] ?? false,
              icone: <FolderInput size={20} />,
            },
            {
              gesto: 'Pintar a nave de um lado',
              resposta: 'Só aquele lado muda; o outro fica como estava',
              visto: completed[2] ?? false,
              icone: <Paintbrush size={20} />,
            },
          ]}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton tom={tom('baixar')} onClick={() => dispatch({ type: 'export-file' })}>
          Baixar o projeto
        </SceneButton>
        <SceneButton
          tom={tom('importar')}
          fechado={c.fileColor === null}
          onClick={() => dispatch({ type: 'import-file' })}
        >
          Importar no Estúdio
        </SceneButton>
      </div>
      {c.fileColor === null && (
        <p className="sz-discovery-small">Importar abre depois que o arquivo existir.</p>
      )}
      <EscolhaLivre
        legenda="Cor da nave da aula"
        valor={c.lessonColor}
        opcoes={CORES.map((cor) => ({ id: cor, rotulo: cor, aria: `Nave da aula ${cor}` }))}
        onEscolher={(color) => dispatch({ type: 'recolor', side: 'lesson', color })}
      />
      <EscolhaLivre
        legenda="Cor da nave do Estúdio"
        valor={c.studioColor}
        fechado={c.studioColor === null}
        nota={c.studioColor === null ? 'Abre depois de importar o arquivo.' : undefined}
        gesto={g?.gesto === 'pintar' ? g.cor : null}
        opcoes={CORES.map((cor) => ({ id: cor, rotulo: cor, aria: `Nave do Estúdio ${cor}` }))}
        onEscolher={(color) => dispatch({ type: 'recolor', side: 'studio', color })}
      />
      <p className="sz-discovery-small">
        Baixar o projeto de novo leva a nave da aula como ela está agora.
      </p>
      <DicaLivre />
    </Frame>
  )
}
