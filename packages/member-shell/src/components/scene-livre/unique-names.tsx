'use client'

import { type SceneUniqueNames, uniqueNamesWarning } from '@sistemazero/core/learning/scene'
import { Copy, Pause, Play, Tag, Unlink } from 'lucide-react'
import { useEffect } from 'react'
import { Frame, SceneButton } from '../scene-discovery-frame'
import { UniqueNamesStage } from '../scene-unique-names'
import { DicaLivre, EscolhaLivre, FaixaLivre, IdeiaRevelada, useTelaLivre } from './meu-jeito-e'

/**
 * A experiência `unique-names` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de `Door`,
 * `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`).
 *
 * ⚠️ Exceção decidida pela responsável (02/11/2026): na Aula 6 o conceito É como o bloco acha o desenho
 * pelo NOME, então os blocos aparecem pelo nome. O que cada caso faz só aparece depois do teste.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DOS_NOMES = ['missing', 'clash', 'own-name'] as const
const OBJETIVOS_DOS_NOMES = [
  'Tire o bloco de cima e observe os três blocos e a prévia.',
  'Com o bloco de cima no lugar, dê o nome nave ao bloco de baixo.',
  'Dê à folha um nome só dela e observe o aviso e a prévia.',
]
type Nome = SceneUniqueNames['bottomName']
const NOMES: { id: Nome; rotulo: string }[] = [
  { id: '', rotulo: 'Sem nome' },
  { id: 'nave', rotulo: 'nave' },
  { id: 'folha-nave', rotulo: 'folha-nave' },
  { id: 'nave2', rotulo: 'nave2' },
]

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDosNomes =
  | { gesto: 'tirar' }
  | { gesto: 'por' }
  | { gesto: 'nome'; nome: Nome }
  | null
export function proximoGestoDosNomes(fala: string | undefined, n: SceneUniqueNames): GestoDosNomes {
  switch (fala) {
    case 'unique-names-start':
    case 'unique-names-own-first':
      return n.topPresent ? { gesto: 'tirar' } : { gesto: 'por' }
    // ⚠️ O nome é pedido mesmo quando já está escolhido: escolhido com o bloco de cima fora, ele não
    // foi testado (pôr o bloco de volta não confere o nome), e escolher de novo é o teste.
    case 'unique-names-missing':
      return n.topPresent ? { gesto: 'nome', nome: 'nave' } : { gesto: 'por' }
    case 'unique-names-clash':
      return n.topPresent ? { gesto: 'nome', nome: 'folha-nave' } : { gesto: 'por' }
    default:
      return null
  }
}

export function LivreUniqueNames() {
  const { activity, state, dispatch, instruction, has, fala, running, setRunning } = useTelaLivre()
  const n = state.uniqueNames
  const aviso = uniqueNamesWarning(n)
  const completed = METAS_DOS_NOMES.map(has)
  const g = proximoGestoDosNomes(fala, n)
  // A prévia anda sozinha: é ela parar que mostra o aviso no jogo.
  useEffect(() => {
    setRunning(true)
    return () => setRunning(false)
  }, [setRunning])
  return (
    <Frame
      title="Cada nome só pode ser de uma coisa"
      kind="nomes"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DOS_NOMES}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <FaixaLivre
          itens={[
            ['Bloco de cima', n.topPresent ? 'no lugar' : 'fora'],
            ['Nome da folha', n.bottomName || 'sem nome'],
            ['Avisos', aviso ? 'um aviso' : 'nenhum'],
          ]}
        />
      }
      stage={<UniqueNamesStage state={state} />}
      after={
        <IdeiaRevelada
          titulo="Como os blocos acham o desenho"
          casos={[
            {
              gesto: 'Sem o bloco que cria nave',
              resposta: 'Os blocos que procuram nave avisam, e a prévia para',
              visto: completed[0] ?? false,
              icone: <Unlink size={20} />,
            },
            {
              gesto: 'Dois blocos criando nave',
              resposta: 'O Estúdio avisa e pede um nome diferente',
              visto: completed[1] ?? false,
              icone: <Copy size={20} />,
            },
            {
              gesto: 'A folha com um nome só dela',
              resposta: 'Cada um com o seu nome, sem aviso',
              visto: completed[2] ?? false,
              icone: <Tag size={20} />,
            },
          ]}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={!n.topPresent}
          tom={
            g?.gesto === (n.topPresent ? 'tirar' : 'por')
              ? 'gesto'
              : n.topPresent
                ? 'ferramenta'
                : 'ligado'
          }
          onClick={() => dispatch({ type: 'toggle-block', present: !n.topPresent })}
        >
          {n.topPresent ? 'Tirar o bloco de cima' : 'Pôr o bloco de cima de volta'}
        </SceneButton>
        <SceneButton aria-pressed={running} onClick={() => setRunning(!running)}>
          {running ? <Pause size={16} /> : <Play size={16} />}{' '}
          {running ? 'Pausar a prévia' : 'Ver a prévia andando'}
        </SceneButton>
      </div>
      <EscolhaLivre<Nome>
        legenda="Nome no bloco de baixo"
        valor={n.bottomName}
        gesto={g?.gesto === 'nome' ? g.nome : null}
        opcoes={NOMES.map((nome) => ({
          id: nome.id,
          rotulo: nome.rotulo,
          aria: `Bloco de baixo: ${nome.id || 'sem nome'}`,
        }))}
        onEscolher={(name) => dispatch({ type: 'name-field', name })}
      />
      <DicaLivre />
    </Frame>
  )
}
