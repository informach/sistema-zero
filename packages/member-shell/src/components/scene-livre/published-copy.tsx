'use client'

import type { SceneCopies, SceneCopyColor } from '@sistemazero/core/learning/scene'
import { Paintbrush, Send, Sparkles } from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { PublishedCopyStage } from '../scene-copies'
import { Frame, SceneButton } from '../scene-discovery-frame'
import { DicaLivre, EscolhaLivre, FaixaLivre, IdeiaRevelada, useTelaLivre } from './meu-jeito-e'

/**
 * A experiência `published-copy` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de `Door`,
 * `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`).
 *
 * A ideia: publicar põe no Mural uma CÓPIA do jogo daquele momento; o projeto continua seu, e cada
 * publicação guarda a sua versão. "Publicar" e "Abrir a versão do Mural" são as ações da plataforma.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DA_PUBLICACAO = ['first-publish', 'only-project', 'republish'] as const
const OBJETIVOS_DA_PUBLICACAO = [
  'Publique e compare o seu projeto com o Mural.',
  'Depois de publicar, troque a cor da nave no projeto e compare.',
  'Publique de novo com a cor nova e olhe os cartões do Mural.',
]
/** O laranja não é cor do projeto nesta cena (`isSceneAction`). */
const CORES: SceneCopyColor[] = ['azul', 'rosa', 'verde']

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDaPublicacao =
  | { gesto: 'publicar' }
  | { gesto: 'pintar'; cor: SceneCopyColor }
  | null
export function proximoGestoDaPublicacao(
  fala: string | undefined,
  c: SceneCopies,
): GestoDaPublicacao {
  const ultima = c.posts.at(-1)
  const outraCor = (): GestoDaPublicacao => ({
    gesto: 'pintar',
    cor: CORES.find((x) => x !== c.projectColor && x !== ultima?.color) ?? 'rosa',
  })
  switch (fala) {
    case 'published-copy-start':
      return { gesto: 'publicar' }
    case 'published-copy-first':
      return ultima ? outraCor() : { gesto: 'publicar' }
    case 'published-copy-only':
      // A cor de agora precisa ser outra que a da última publicação, ou publicar não mostra a nova.
      return ultima && ultima.color !== c.projectColor ? { gesto: 'publicar' } : outraCor()
    default:
      return null
  }
}

export function LivrePublishedCopy() {
  const { activity, state, dispatch, instruction, has, fala } = useTelaLivre()
  const c = state.copies
  const completed = METAS_DA_PUBLICACAO.map(has)
  const g = proximoGestoDaPublicacao(fala, c)
  return (
    <Frame
      title="A cópia que foi para o Mural"
      kind="publicacao"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DA_PUBLICACAO}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <FaixaLivre
          itens={[
            ['Seu projeto', c.projectColor],
            ['Publicações no Mural', c.posts.length],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <PublishedCopyStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaRevelada
          titulo="O que acontece no Mural"
          casos={[
            {
              gesto: 'Publicar',
              resposta: 'Uma cópia do jogo daquele momento vai para o Mural',
              visto: completed[0] ?? false,
              icone: <Send size={20} />,
            },
            {
              gesto: 'Trocar a cor no projeto',
              resposta: 'Só o seu projeto muda; o Mural guarda a cópia como estava',
              visto: completed[1] ?? false,
              icone: <Paintbrush size={20} />,
            },
            {
              gesto: 'Publicar de novo',
              resposta: 'Entra uma publicação nova; a anterior continua lá',
              visto: completed[2] ?? false,
              icone: <Sparkles size={20} />,
            },
          ]}
        />
      }
    >
      <EscolhaLivre
        legenda="Cor da nave no seu projeto"
        valor={c.projectColor}
        gesto={g?.gesto === 'pintar' ? g.cor : null}
        opcoes={CORES.map((cor) => ({ id: cor, rotulo: cor, aria: `Nave do projeto ${cor}` }))}
        onEscolher={(color) => dispatch({ type: 'recolor', side: 'project', color })}
      />
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={g?.gesto === 'publicar' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'publish' })}
        >
          Publicar
        </SceneButton>
        <SceneButton
          fechado={c.posts.length === 0}
          onClick={() => dispatch({ type: 'open-mural' })}
        >
          Abrir a versão do Mural
        </SceneButton>
      </div>
      {c.posts.length === 0 && (
        <p className="sz-discovery-small">Abrir a versão do Mural abre depois de publicar.</p>
      )}
      <DicaLivre />
    </Frame>
  )
}
