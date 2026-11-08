'use client'
/**
 * Tela livre da Ilha do Farol: as três experiências em 3D (08/11/2026, proposta "Experiências do
 * Faísca" aprovada).
 *
 * - Ponto de vista: a CÂMERA é um controle com a forma de câmera (de frente, de lado, de cima). Ver a
 *   chave aparecer abre a pergunta grande embaixo da cena ("o que mudou: a câmera ou a chave?").
 * - Os três números: cada número com − e + e a COR do eixo do Estúdio 3D (x vermelho, y verde, z
 *   azul); o papel de cada um só aparece depois de testar os dois sentidos. Teclado: A/D o x, W/S o
 *   z, + e − o y.
 * - O contato: o personagem ANDA com as setas (meio passo por toque, repetindo enquanto segura) e o
 *   jogo confere o encontro a cada passo, como no jogo (sai o "Testar o encontro"); o resultado
 *   aparece na cena. A altura da chave tem − e +, e as caixas do encontro são um interruptor.
 */
import {
  discoveryGuidance,
  discoverySpeech,
  ISLAND_ORIGIN,
  type IslandState,
  islandContact,
} from '@sistemazero/core/learning/scene'
import { SkipBack } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SONS } from '../lib/scene-sons'
import {
  alvoDeTexto,
  type Cartao,
  Cruzeta,
  type Direcao,
  type FotoDe,
  Frame,
  Interruptor,
  Modulo,
  Redondo,
  semNoSeuJogo,
  useFotinhos,
  useNaTela,
} from './scene-discovery-frame'
import { PerguntaGrande, useRepetir } from './scene-faisca-livre'
import { IslandWorld } from './scene-island-world'

type Eixo = 'x' | 'y' | 'z'
const COR: Record<Eixo, string> = { x: '#e5484d', y: '#2f9e5b', z: '#3e63dd' }
const PAPEL: Record<Eixo, string> = { x: 'anda no chão', y: 'é a altura', z: 'anda no chão' }
const VISTAS = [
  { v: 'front', rotulo: 'Frente', icone: '' },
  { v: 'side', rotulo: 'Lado', icone: '' },
  { v: 'top', rotulo: 'Cima', icone: '' },
] as const
const num = (n: number) => String(n).replace('.', ',').replace('-', '−')

const CARTOES: Record<IslandState['mode'], Cartao[]> = {
  view: [
    {
      id: 'other-view',
      emoji: '🎥',
      pergunta: 'De outro lugar, o que aparece?',
      descoberta: 'a chave escondida aparece.',
    },
    {
      id: 'same-place',
      emoji: '🔑',
      pergunta: 'Quando a chave apareceu, o que mudou?',
      descoberta: 'mudou a câmera; a chave ficou no lugar.',
    },
  ],
  position: [
    {
      id: 'axis-x',
      emoji: '🔴',
      pergunta: 'E se o x mudar?',
      descoberta: 'a chave anda pelo chão, para os lados.',
    },
    {
      id: 'axis-y',
      emoji: '🟢',
      pergunta: 'E se o y mudar?',
      descoberta: 'a chave sobe e desce: é a altura.',
    },
    {
      id: 'axis-z',
      emoji: '🔵',
      pergunta: 'E se o z mudar?',
      descoberta: 'a chave anda pelo chão, para frente e para trás.',
    },
  ],
  contact: [
    {
      id: 'contact-apart',
      emoji: '👀',
      pergunta: 'De cima parece junto. Está encostando?',
      descoberta: 'não: tinha um espaço entre eles.',
    },
    {
      id: 'contact-touch',
      emoji: '🤝',
      pergunta: 'E quando encosta de verdade?',
      descoberta: 'o jogo conta o encontro.',
    },
  ],
}
const fotoDe: FotoDe = (antes, depois, acao) => {
  const a = antes.island3d
  const d = depois.island3d
  if (!a || !d) return null
  if (acao.type === 'island-view' && d.mode === 'view')
    return {
      titulo: `Câmera de ${VISTAS.find((v) => v.v === acao.view)?.rotulo.toLowerCase()}`,
      texto: acao.view === 'front' ? 'a chave atrás da pedra' : 'a chave apareceu',
    }
  if (acao.type === 'island-axis' && d.mode === 'position')
    return {
      titulo: `${acao.axis} mudou`,
      texto: `${acao.axis}: ${num(a.key[acao.axis])} → ${num(d.key[acao.axis])}`,
    }
  if (acao.type === 'island-test')
    return {
      titulo: `Personagem em x ${num(d.hero.x)}, z ${num(d.hero.z)} · chave na altura ${num(d.key.y)}`,
      texto: d.tested ? 'encostou' : 'não encostou',
    }
  return null
}

/**
 * Para onde uma seta leva o personagem no contato, seguindo a câmera como a criança vê a tela: de
 * frente e de cima, → é o x e ↑ é o fundo (z menor); de lado (a câmera no x positivo, olhando para o
 * x negativo), → é o z menor e ↑ é o x menor, que é longe da câmera.
 */
export function passoDaSeta(
  view: IslandState['view'],
  dir: Direcao,
): { eixo: 'x' | 'z'; sinal: 1 | -1 } {
  const lado = dir === 'esquerda' || dir === 'direita'
  if (view === 'side')
    return { eixo: lado ? 'z' : 'x', sinal: dir === 'direita' || dir === 'cima' ? -1 : 1 }
  return { eixo: lado ? 'x' : 'z', sinal: dir === 'direita' || dir === 'baixo' ? 1 : -1 }
}

export function IslandDiscovery() {
  const p = useFotinhos({ fotoDe })
  const s = p.state.island3d!
  const modo = s.mode
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const raiz = useRef<HTMLDivElement>(null)
  const visivel = useNaTela(raiz)
  const [pronto, setPronto] = useState(false)
  const cartoes = CARTOES[modo].filter(
    (c) => !p.activity.setup?.goals || p.activity.setup.goals.includes(c.id),
  )
  const repetir = useRepetir()
  const [segurando, setSegurando] = useState<ReadonlySet<Direcao>>(new Set())

  // O gesto que mexe e, no contato, o jogo conferindo o encontro logo depois.
  const atual = useRef(s)
  atual.current = s
  const mudar = (eixo: Eixo, d: 1 | -1) => {
    const k = atual.current.key[eixo]
    const novo = k + d * 0.5
    if (novo < (eixo === 'y' ? 0 : -4) || novo > 4) {
      SONS.borda()
      return
    }
    SONS.quadro()
    p.dispatch({ type: 'island-axis', axis: eixo, value: novo })
    if (modo === 'contact') p.dispatch({ type: 'island-test' })
  }
  const andarUm = (dir: Direcao) => {
    const { eixo, sinal } = passoDaSeta(atual.current.view, dir)
    const novo = atual.current.hero[eixo] + sinal * 0.5
    if (novo < -4 || novo > 4) {
      SONS.borda()
      return
    }
    p.dispatch({ type: 'island-hero', axis: eixo, value: novo })
    p.dispatch({ type: 'island-test' })
  }
  // Teclado da posição: A/D o x, W/S o z, + e − o y.
  const fns = useRef({ mudar })
  fns.current = { mudar }
  useEffect(() => {
    if (modo !== 'position') return
    const tecla = (e: KeyboardEvent) => {
      if (!visivel.current || alvoDeTexto(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const m = fns.current.mudar
      const mapa: Record<string, () => void> = {
        KeyA: () => m('x', -1),
        KeyD: () => m('x', 1),
        KeyW: () => m('z', -1),
        KeyS: () => m('z', 1),
      }
      const acao =
        mapa[e.code] ??
        (e.key === '+' || e.key === '='
          ? () => m('y', 1)
          : e.key === '-'
            ? () => m('y', -1)
            : undefined)
      if (!acao) return
      e.preventDefault()
      acao()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [modo, visivel])
  // O som do resultado do encontro.
  const testado = useRef(s.tested)
  useEffect(() => {
    if (s.tested !== null && s.tested !== testado.current) s.tested ? SONS.pegar() : SONS.nada()
    testado.current = s.tested
  }, [s.tested])

  // A fala vem do motor (as frases que o Admin grava com a voz do Zappy).
  const fala = discoveryGuidance(p.activity, p.state)?.text ?? ''

  const camera = (
    <Modulo titulo="A câmera" icone="🎥" dica="De onde a gente olha a ilha.">
      <div
        className="sz-discovery-velocidade sz-discovery-livre-camera"
        role="group"
        aria-label="Onde fica a câmera"
      >
        {VISTAS.map((v) => (
          <button
            key={v.v}
            type="button"
            aria-pressed={s.view === v.v}
            data-pulsar={
              (modo === 'view' && !f('other-view') && v.v === 'side') ||
              (modo === 'contact' && s.view === 'top' && !f('contact-touch') && v.v === 'side')
            }
            disabled={!pronto}
            onClick={() => {
              p.dispatch({ type: 'island-view', view: v.v })
              // No contato, o jogo confere o encontro o tempo todo: olhar de outro lugar também é
              // ver o resultado do encontro (a descoberta cai quando a criança olha, não no passo).
              if (modo === 'contact') p.dispatch({ type: 'island-test' })
            }}
          >
            {v.rotulo}
          </button>
        ))}
      </div>
    </Modulo>
  )
  const numero = (eixo: Eixo, rotulo?: string, pulsarMenos?: boolean) => {
    const papel = modo !== 'position' || f(`axis-${eixo}`)
    return (
      <div
        className="sz-discovery-passos sz-discovery-livre-eixo"
        style={{ '--eixo': COR[eixo] } as never}
        role="group"
        aria-label={`Número ${eixo}: ${num(s.key[eixo])}`}
      >
        <span className="sz-discovery-eixo">
          {rotulo ?? eixo}
          {papel && !rotulo ? <small>{PAPEL[eixo]}</small> : null}
        </span>
        <button
          type="button"
          aria-label={`${eixo} menos meio`}
          disabled={!pronto}
          data-pulsar={pulsarMenos || undefined}
          onClick={() => mudar(eixo, -1)}
        >
          −
        </button>
        <strong>{num(s.key[eixo])}</strong>
        <button
          type="button"
          aria-label={`${eixo} mais meio`}
          disabled={!pronto}
          onClick={() => mudar(eixo, 1)}
        >
          +
        </button>
      </div>
    )
  }
  return (
    <Frame
      raiz={raiz}
      title="A ilha em 3D"
      kind="ilha"
      activity={p.activity}
      state={p.state}
      text={fala}
      reset={() => p.dispatch({ type: 'reset' })}
      cartoes={cartoes}
      fotos={p.fotos}
      ideia={discoverySpeech(`island-${modo}-idea`)}
      ponte={semNoSeuJogo(discoverySpeech(`island-${modo}-bridge`))}
      stage={<IslandWorld state={s} onReady={setPronto} />}
      noPalco={
        modo === 'contact' ? (
          <span
            className="sz-discovery-livre-encontro"
            data-encostou={islandContact(s)}
            role="status"
          >
            {islandContact(s) ? '🤝 Encostou!' : '↔️ Não encostou'}
          </span>
        ) : null
      }
      abaixoDoPalco={
        modo === 'view' && f('other-view') && !f('same-place') ? (
          <PerguntaGrande
            texto="Quando a chave apareceu, o que mudou?"
            opcoes={[
              {
                rotulo: '📷 O lugar da câmera',
                escolhida: s.answer === 'camera',
                onClick: () => p.dispatch({ type: 'island-answer', answer: 'camera' }),
              },
              {
                rotulo: '🔑 O lugar da chave',
                escolhida: s.answer === 'key',
                onClick: () => {
                  SONS.nada()
                  p.dispatch({ type: 'island-answer', answer: 'key' })
                },
              },
            ]}
          />
        ) : null
      }
      ferramentas={
        modo === 'view' ? undefined : (
          <Redondo
            rotulo="Voltar a chave e o personagem ao começo"
            texto="Começo"
            onClick={() => p.dispatch({ type: 'island-restart' })}
          >
            <SkipBack size={16} />
          </Redondo>
        )
      }
      // No contato, os módulos vão na ordem do que a criança faz: olhar de lado, baixar a chave e,
      // depois, andar para testar outros lugares.
      controles={
        modo === 'view' ? (
          camera
        ) : modo === 'position' ? (
          <>
            <Modulo
              titulo="Os números da chave"
              icone="🔢"
              largo
              dica={
                <>
                  Começa em x {num(ISLAND_ORIGIN.x)}, y {num(ISLAND_ORIGIN.y)}, z{' '}
                  {num(ISLAND_ORIGIN.z)}.
                  <span className="sz-discovery-so-teclado">
                    {' '}
                    No teclado: A e D o x, W e S o z, + e − o y.
                  </span>
                </>
              }
            >
              <div className="sz-discovery-linha sz-discovery-livre-eixos">
                {numero('x')}
                {numero('y')}
                {numero('z')}
              </div>
            </Modulo>
            {camera}
          </>
        ) : (
          <>
            {camera}
            <Modulo titulo="Altura da chave" icone="🟢" dica="O y: quanto mais, mais alto.">
              {numero('y', 'y', f('contact-apart') && !f('contact-touch') && s.view !== 'top')}
            </Modulo>
            <Modulo
              titulo="Andar"
              icone="🎮"
              dica={
                <>
                  O jogo confere o encontro o tempo todo.
                  <span className="sz-discovery-so-teclado"> No teclado: setas ou W A S D</span>
                </>
              }
            >
              <Cruzeta
                raiz={raiz}
                segurando={segurando}
                segurar={(d) => {
                  setSegurando(new Set([d]))
                  repetir.segurar(() => andarUm(d))
                }}
                soltar={() => {
                  setSegurando(new Set())
                  repetir.parar()
                }}
                mao={f('contact-touch') && p.fotos.length < 3}
              />
            </Modulo>
            <Modulo titulo="O encontro" icone="📦" dica="As caixas que o jogo confere.">
              <Interruptor
                ligado={s.bounds}
                estado={(on) => (on ? 'Caixas à vista' : 'Caixas escondidas')}
                onClick={() => p.dispatch({ type: 'island-bounds', visible: !s.bounds })}
              />
            </Modulo>
          </>
        )
      }
    />
  )
}
