'use client'
/**
 * ⭐⭐ As experiências do Cadê Todo Mundo? (08/11/2026, proposta aprovada no Canvas).
 *
 * O TOQUE: a regra é uma PEÇA que a criança encaixa num slot ("Quando tocar → mostrar"); sem ela,
 * tocar não faz nada. Desde 09/11/2026 ("Experiências numa tela só", arranjo do Faísca) o slot mora
 * no painel da direita, embaixo da fala do Zappy, e não mais em cima do jardim. "Esconder de novo" esconde todo mundo e mantém a
 * peça. OS ACHADOS: o número "achados" no placar, com o "+1" ou "continua N" pulando embaixo dele a
 * cada toque, e "Nova busca" no painel.
 *
 * As falas são as do motor (`discoveryGuidance`, as mesmas que o Admin grava com a voz do Zappy); a
 * ideia e a ponte, as de `discoverySpeech`. Sons do jogo em `scene-sons.ts`.
 */
import { discoverySpeech } from '@sistemazero/core/learning/scene'
import { JARDIM_PARES, jardimSpriteRect } from '@sistemazero/studio/arte'
import { EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SONS } from '../lib/scene-sons'
import { SceneCenarioProvider } from './scene-cenario-context'
import {
  BotaoGrande,
  type Cartao,
  type FotoDe,
  Frame,
  Modulo,
  Redondo,
  semNoSeuJogo,
  useFotinhos,
} from './scene-discovery-frame'
import { Encaixe } from './scene-faisca-livre'
import { FoundCounterStage } from './scene-found-counter'
import { TwoHidingPlaces } from './scene-two-hiding-places'

const pct = (n: number, total: number) => `${(n / total) * 100}%`

/* ═════════════════════════ O TOQUE ═════════════════════════ */

const CARTOES_TOQUE: Cartao[] = [
  {
    id: 'no-response',
    emoji: '🚫',
    pergunta: 'E se não tiver regra?',
    descoberta: 'sem regra, o toque não mostra ninguém.',
  },
  {
    id: 'responds',
    emoji: '🧩',
    pergunta: 'E com a regra encaixada?',
    descoberta: 'com a regra, o toque mostra quem está escondido.',
  },
  {
    id: 'second-target',
    emoji: '🪨',
    pergunta: 'A regra vale nas pedras também?',
    descoberta: 'a mesma regra vale para o esconderijo que você tocar.',
  },
]
const BICHO = ['o coelho', 'a raposa'] as const
const fotoToque: FotoDe = (antes, depois, acao) => {
  if (acao.type !== 'touch-hiding-place') return null
  const id = acao.id
  const ja = (antes.match.gardenFound ?? []).includes(id)
  const agora = (depois.match.gardenFound ?? []).includes(id)
  return {
    titulo: depois.match.touch ? 'Com a regra' : 'Sem a regra',
    texto: `toque ${id === 0 ? 'no arbusto' : 'nas pedras'} → ${
      ja ? 'já estava à vista' : agora ? `${BICHO[id]} apareceu` : 'nada'
    }`,
  }
}

const PECA = (
  <>
    <span aria-hidden>👆</span> Quando tocar <span aria-hidden>→</span> <span aria-hidden>👀</span>{' '}
    mostrar
  </>
)

function Toque() {
  const p = useFotinhos({ fotoDe: fotoToque })
  const m = p.state.match
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const nadaAinda = p.fotos.length === 0
  const arbusto = jardimSpriteRect('arbusto', 175, 251)
  const pedras = jardimSpriteRect('pedras', 385, 251)
  const alvo = f('responds') && !f('second-target') ? pedras : arbusto
  const pulsar =
    (nadaAinda && !m.touch) || (m.touch && !f('responds')) || (f('responds') && !f('second-target'))
  const ultimaFoto = p.fotos[0]
  useEffect(() => {
    if (!ultimaFoto) return
    if (ultimaFoto.texto.includes('apareceu')) SONS.aparece()
    else SONS.nada()
  }, [ultimaFoto])
  const pulsarPeca = f('no-response') && !m.touch && !f('responds')
  return (
    <Frame
      arranjo="faisca"
      aspectoDoPalco={560 / 300}
      title="O toque faz o jogo responder"
      kind="toque"
      activity={p.activity}
      state={p.state}
      text={p.instruction}
      reset={() => p.dispatch({ type: 'reset' })}
      cartoes={CARTOES_TOQUE}
      fotos={p.fotos}
      ideia={discoverySpeech('touch-idea')}
      ponte={semNoSeuJogo(discoverySpeech('touch-bridge'))}
      pulso={
        pulsar
          ? {
              left: pct(alvo.x, 560),
              top: pct(alvo.y, 300),
              width: pct(alvo.w, 560),
              height: pct(alvo.h, 300),
            }
          : null
      }
      stage={
        <SceneCenarioProvider cenario="jardim">
          <TwoHidingPlaces state={p.state} dispatch={p.dispatch} />
        </SceneCenarioProvider>
      }
      controles={
        <Modulo titulo="A regra do toque" icone="🧩" largo>
          <Encaixe
            rotulo="Regra do toque"
            peca={PECA}
            encaixada={m.touch}
            estado={m.touch ? 'Encaixada. Toque para tirar.' : 'Toque na peça para encaixar.'}
            pulsar={pulsarPeca}
            aria={m.touch ? 'Tirar a regra do toque' : 'Encaixar a regra do toque'}
            onClick={() => {
              SONS.encaixe()
              p.dispatch({ type: 'connect', port: 'touch', enabled: !m.touch })
            }}
          />
        </Modulo>
      }
      ferramentas={
        <Redondo
          rotulo="Esconder todo mundo de novo, mantendo a regra"
          texto="Esconder de novo"
          onClick={() => p.dispatch({ type: 'restart-hiding-places' })}
        >
          {/* Ícone desenhado, não emoji: no celular o botão fica só com o ícone (a letra vai a 0). */}
          <EyeOff size={16} aria-hidden />
        </Redondo>
      }
    />
  )
}

/* ═════════════════════════ OS ACHADOS ═════════════════════════ */

const CARTOES_ACHADOS: Cartao[] = [
  {
    id: 'first-find',
    emoji: '🐰',
    pergunta: 'O que muda quando você acha alguém?',
    descoberta: 'achados ganhou 1.',
  },
  {
    id: 'second-find',
    emoji: '🦊',
    pergunta: 'E quando acha outro?',
    descoberta: 'ganhou mais 1: o número vai somando.',
  },
  {
    id: 'no-find',
    emoji: '🌱',
    pergunta: 'E se tocar onde não tem ninguém?',
    descoberta: 'sem achado, o número fica igual.',
  },
  {
    id: 'repeat',
    emoji: '🔁',
    pergunta: 'E tocar de novo em quem já achou?',
    descoberta: 'quem já foi achado não conta de novo.',
  },
  {
    id: 'back-to-zero',
    emoji: '🧺',
    pergunta: 'E numa busca nova?',
    descoberta: 'achados volta a 0.',
  },
]
const NOMES = ['no arbusto', 'nas pedras', 'nas flores'] as const
const fotoAchados: FotoDe = (antes, depois, acao) => {
  const de = antes.match.points
  const para = depois.match.points
  if (acao.type === 'find-character')
    return {
      titulo: (antes.match.foundIds ?? []).includes(acao.id) ? 'Toquei de novo' : 'Toquei',
      texto: `${NOMES[acao.id] ?? 'num esconderijo'} → achados ${de} → ${para}`,
    }
  if (acao.type === 'look-around')
    return { titulo: 'Grama', texto: `ninguém aqui → achados ${de} → ${para}` }
  if (acao.type === 'restart-search')
    return { titulo: 'Busca nova', texto: `achados ${de} → ${para}` }
  return null
}

function Achados() {
  const p = useFotinhos({ fotoDe: fotoAchados })
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const [salto, setSalto] = useState<{ n: number; texto: string; mais: boolean } | null>(null)
  const ultima = p.fotos[0]
  useEffect(() => {
    if (!ultima) return
    const mudou = /achados (\d+) → (\d+)/.exec(ultima.texto)
    if (!mudou) return
    const de = Number(mudou[1])
    const para = Number(mudou[2])
    if (para > de) SONS.ponto()
    else SONS.nada()
    setSalto({
      n: ultima.n,
      mais: para > de,
      texto: para > de ? `+${para - de}` : para < de ? 'voltou a 0' : `continua ${para}`,
    })
    const t = setTimeout(() => setSalto(null), 1400)
    return () => clearTimeout(t)
  }, [ultima])
  // O mesmo desenho do palco: fundo 640 × 360 em "slice" num palco 560 × 300.
  const escala = 0.875
  const par = JARDIM_PARES[0]
  const arbusto = jardimSpriteRect(par.esconderijo, par.centroX)
  return (
    <Frame
      arranjo="faisca"
      aspectoDoPalco={560 / 300}
      title="O jogo guarda os achados"
      kind="achados"
      activity={p.activity}
      state={p.state}
      text={p.instruction}
      reset={() => p.dispatch({ type: 'reset' })}
      cartoes={CARTOES_ACHADOS}
      fotos={p.fotos}
      ideia={discoverySpeech('count-idea')}
      ponte={semNoSeuJogo(discoverySpeech('count-bridge'))}
      pulso={
        p.fotos.length === 0
          ? {
              left: pct(arbusto.x * escala, 560),
              top: pct(arbusto.y * escala - 7.5, 300),
              width: pct(arbusto.w * escala, 560),
              height: pct(arbusto.h * escala, 300),
            }
          : null
      }
      stage={
        <SceneCenarioProvider cenario="jardim">
          <FoundCounterStage state={p.state} dispatch={p.dispatch} />
        </SceneCenarioProvider>
      }
      noPalco={
        salto ? (
          <span
            key={salto.n}
            className="sz-discovery-salto sz-discovery-salto-placar"
            data-mais={salto.mais}
          >
            {salto.texto}
          </span>
        ) : null
      }
      controles={
        <>
          <Modulo titulo="Como jogar" icone="👆" dica="Toque nos esconderijos ou na grama.">
            <span className="sz-discovery-modulo-texto">
              Ache os bichinhos escondidos no jardim.
            </span>
          </Modulo>
          <Modulo
            compacto
            titulo="Partida"
            icone="🧺"
            dica="Os bichinhos se escondem e achados volta a 0."
          >
            <BotaoGrande
              pulsar={f('second-find') && f('no-find') && f('repeat') && !f('back-to-zero')}
              onClick={() => p.dispatch({ type: 'restart-search' })}
            >
              <span aria-hidden>🧺</span> Nova busca
            </BotaoGrande>
          </Modulo>
        </>
      }
    />
  )
}

export function ProposedGarden({ part }: { part: 'touch' | 'count' }) {
  return part === 'touch' ? <Toque /> : <Achados />
}
