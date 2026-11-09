'use client'
/**
 * Tela livre do Poder "O baú dos símbolos" (08/11/2026, proposta "Experiências do Faísca" aprovada). O personagem ANDA até as pedras: chegar numa
 * pedra é tocar o símbolo (sai o "Tocar o sol / a lua / a estrela"). Como o baú decide é uma peça que
 * se troca ("confere a ordem" × "só conta"). O `passo` fica para a montagem: o caderninho diz "Em que
 * passo da placa?".
 */
import { discoveryGuidance, discoverySpeech } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT } from '@sistemazero/studio/arte'
import { useEffect, useRef } from 'react'
import { SONS } from '../lib/scene-sons'
import {
  BotaoGrande,
  type Cartao,
  type FotoDe,
  Frame,
  Modulo,
  semNoSeuJogo,
  useFotinhos,
} from './scene-discovery-frame'
import {
  CaderninhoDe,
  cartoesDaAtividade,
  centro,
  ModuloAndar,
  Troca,
  useChegada,
  useMapaLivre,
} from './scene-faisca-livre'
import { PEDRAS_DA_CENA, SymbolSequenceStage } from './scene-symbol-sequence'

const CARTOES: Cartao[] = [
  {
    id: 'step-moves',
    emoji: '👣',
    pergunta: 'Tocando o sol e depois a lua, o que muda?',
    descoberta: 'o passo anda: 1, depois 2.',
  },
  {
    id: 'right-order',
    emoji: '☀️',
    pergunta: 'E seguindo a placa até o fim?',
    descoberta: 'o baú abre.',
  },
  {
    id: 'out-of-turn',
    emoji: '❌',
    pergunta: 'E se pular um símbolo?',
    descoberta: 'fora da vez, a tentativa recomeça.',
  },
  {
    id: 'middle-start',
    emoji: '🌙',
    pergunta: 'E se começar pelo meio?',
    descoberta: 'nada avança.',
  },
  {
    id: 'restart-works',
    emoji: '🔁',
    pergunta: 'Depois de errar, ainda dá?',
    descoberta: 'sim: na ordem certa, o baú abre.',
  },
  {
    id: 'count-vs-order',
    emoji: '🔢',
    pergunta: 'E se o baú só contar os símbolos?',
    descoberta: 'só contando, a ordem errada também abre.',
  },
]
const NOME = { sol: 'Sol', lua: 'Lua', estrela: 'Estrela' } as const
const fotoDe: FotoDe = (antes, depois, acao) => {
  if (acao.type !== 'touch-symbol') return null
  const a = antes.sequence
  const d = depois.sequence
  if (d.chest === 'open' && a.chest !== 'open')
    return { titulo: NOME[acao.symbol], texto: 'o baú abriu!' }
  if (d.mode === 'count')
    return {
      titulo: `${NOME[acao.symbol]} (só contando)`,
      texto: `${d.lit.length} ${d.lit.length === 1 ? 'tocado' : 'tocados'}`,
    }
  return d.passo > a.passo
    ? { titulo: NOME[acao.symbol], texto: `passo ${a.passo} → ${d.passo}` }
    : { titulo: `${NOME[acao.symbol]} fora da vez`, texto: `passo ${a.passo} → ${d.passo}` }
}
const ALVOS = {
  sol: centro(PEDRAS_DA_CENA.sol),
  lua: centro(PEDRAS_DA_CENA.lua),
  estrela: centro(PEDRAS_DA_CENA.estrela),
}
const INICIO = { x: FAROL_LAYOUT.personagem.x, y: FAROL_LAYOUT.personagem.y }

export function SimbolosLivre() {
  const p = useFotinhos({ fotoDe })
  const q = p.state.sequence
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const raiz = useRef<HTMLDivElement>(null)
  const andar = useMapaLivre({ inicio: INICIO })
  useChegada(andar.pos, ALVOS, 30, (s) => p.dispatch({ type: 'touch-symbol', symbol: s }))
  const antes = useRef({ passo: q.passo, chest: q.chest, lit: q.lit.length })
  useEffect(() => {
    const a = antes.current
    if (q.chest === 'open' && a.chest !== 'open') SONS.abre()
    else if (q.passo > a.passo || q.lit.length > a.lit) SONS.aparece()
    else if (q.at && (q.passo < a.passo || q.missed)) SONS.nada()
    antes.current = { passo: q.passo, chest: q.chest, lit: q.lit.length }
  }, [q.passo, q.chest, q.lit.length, q.at, q.missed])
  const jogarDeNovo = () => {
    andar.voltar()
    p.dispatch({ type: 'restart-symbols' })
  }
  return (
    <Frame
      raiz={raiz}
      title="A ordem dos símbolos"
      kind="simbolos"
      activity={p.activity}
      state={p.state}
      text={discoveryGuidance(p.activity, p.state)?.text ?? ''}
      reset={() => {
        andar.voltar()
        p.dispatch({ type: 'reset' })
      }}
      cartoes={cartoesDaAtividade(CARTOES, p.activity)}
      fotos={p.fotos}
      ideia={discoverySpeech('symbols-idea')}
      ponte={semNoSeuJogo(discoverySpeech('symbols-bridge'))}
      stage={
        <SymbolSequenceStage state={p.state} heroi={{ ...andar.pos, esquerda: andar.esquerda }} />
      }
      movimento={
        <ModuloAndar raiz={raiz} andar={andar} mao={p.fotos.length === 0 && !andar.andando} />
      }
      controles={
        <>
          <Modulo titulo="A regra do baú" icone="🧩" largo>
            <Troca
              rotulo="O baú confere"
              antes="O baú confere"
              opcoes={[
                { v: 'order', peca: <>a ordem dos símbolos</>, aria: 'O baú confere a ordem' },
                {
                  v: 'count',
                  peca: <>só quantos foram tocados</>,
                  aria: 'O baú só conta os símbolos',
                },
              ]}
              valor={q.mode}
              pulsar={f('restart-works') && !f('count-vs-order') ? 'count' : null}
              onChange={(v) => {
                SONS.encaixe()
                andar.voltar()
                p.dispatch({ type: 'sequence-mode', mode: v })
              }}
            />
          </Modulo>
          <Modulo titulo="O jogo guarda" icone="📓" dica="Cada símbolo olha aqui.">
            <CaderninhoDe
              linhas={[
                q.mode === 'order'
                  ? {
                      pergunta: 'Em que passo da placa?',
                      resposta: `${q.chest === 'open' ? 3 : q.passo} de 3`,
                    }
                  : { pergunta: 'Quantos símbolos tocados?', resposta: `${q.lit.length} de 3` },
              ]}
            />
          </Modulo>
          <Modulo titulo="Partida" icone="🔄" dica="Os símbolos apagam e o passo volta a 0.">
            <BotaoGrande
              pulsar={q.chest === 'open' || (f('out-of-turn') && !f('middle-start'))}
              onClick={jogarDeNovo}
            >
              <span aria-hidden>🔄</span> Jogar de novo
            </BotaoGrande>
          </Modulo>
        </>
      }
    />
  )
}
