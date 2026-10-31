import { useFrame } from '@react-three/fiber'
import { compactarResultado, resultadoDoPercurso } from '@sistemazero/arquipelago-contracts'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  type Group,
  MeshBasicMaterial,
  SphereGeometry,
  type Sprite,
  SpriteMaterial,
} from 'three'
import { useJogo } from '../estado/contexto'
import { lojaDosFantasmas } from '../estado/fantasmas'
import type { LojaDoJogo } from '../estado/loja'
import type { Ponto } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import {
  type ConfigDoPercurso,
  type Corrida,
  criarCorrida,
  estrelasDaCorrida,
  formatarTempo,
  indiceDoSegredo,
  juntarResultado,
  type PontosDoPercurso,
  passoDaCorrida,
  quantasEstrelas,
  segredoAparece,
  vagalumesPegos,
} from '../sistemas/percurso'
import { useInterativo } from './interativos'

/** O que muda a cada quadro, sem alocar. */
interface Quadro {
  corpo: { x: number; y: number; z: number; pes: number; noChaoDaIlha: boolean }
  corte: { fase: 'nada' | 'saindo' | 'voltando'; ms: number; comecar: boolean }
  destino: { x: number; y: number; z: number }
  olhar: number
}

/** As cores do que se pega no caminho: o vagalume do Bosque e o confeito da Vila. */
export interface CoresDoColetavel {
  nucleo: string
  brilho: string
  /** O degradê do brilho (do meio para a borda). */
  degrade: [string, string, string]
}

export const CORES_DO_VAGALUME: CoresDoColetavel = {
  nucleo: '#fff7a8',
  brilho: '#f4ff9a',
  degrade: ['rgba(255,248,170,1)', 'rgba(214,255,120,0.55)', 'rgba(160,255,120,0)'],
}

/**
 * Um percurso com tempo e estrelas numa ilha completa ativa (as regras em `sistemas/percurso.ts`):
 * o "Começar" na largada, o cronômetro que só anda com o jogo andando, as coisas para pegar, a
 * queda que volta à última parada com o corte suave, a chegada com o resultado no salvamento e os
 * pedidos da tela (correr de novo, parar). O Bosque e a Vila Doce usam o mesmo.
 */
export function CorridaNaIlha({
  ilhaId,
  config,
  pontos,
  largada,
  alturaDoChao,
  cores,
}: {
  ilhaId: string
  config: ConfigDoPercurso
  pontos: PontosDoPercurso | null
  /** Onde fica o "Começar" (a placa do Bosque, o chão na frente dos caixotes). */
  largada: Ponto
  /** Os pés abaixo disto, pisando, estão no chão da ilha (caiu do percurso). */
  alturaDoChao: number
  cores: CoresDoColetavel
}) {
  const { loja, movimento, rastro, pedidos, plataforma, fila } = useJogo()
  const fantasmas = lojaDosFantasmas(loja, plataforma, fila)
  const menosMovimento = useReducedMotion()
  const q = useRef<Quadro>({
    corpo: { x: 0, y: 0, z: 0, pes: 0, noChaoDaIlha: false },
    corte: { fase: 'nada', ms: 0, comecar: false },
    destino: { x: 0, y: 0, z: 0 },
    olhar: 0,
  }).current
  const coletaveis = useRef<(Group | null)[]>([])
  const tempo = useRef(0)

  // Uma corrida não continua numa ilha que não está mais ali.
  useEffect(
    () => () => {
      fantasmas.cancelar(config.id)
      if (movimento.corrida) {
        movimento.corrida = null
        loja.getState().definirCorrida(null)
      }
    },
    [movimento, loja, fantasmas, config.id],
  )

  /** Escurece, leva o corpo e clareia (a volta à parada e o "Correr de novo"). */
  const cortarPara = (destino: Ponto, olhar: number, comecar: boolean) => {
    q.destino.x = destino.x
    q.destino.y = destino.y + CORPO.doCentroAoPe + 0.05
    q.destino.z = destino.z
    q.olhar = olhar
    q.corte.fase = 'saindo'
    q.corte.ms = 0
    q.corte.comecar = comecar
    loja.getState().cortar()
  }
  const comecar = () => {
    if (!pontos) return
    movimento.corrida = criarCorrida(
      pontos.vagalumes.length,
      indiceDoSegredo(pontos.largada, pontos.chegada, pontos.vagalumes),
    )
    const s = loja.getState()
    s.mostrarResultado(null)
    s.definirCorrida({
      percurso: config.id,
      vagalumes: 0,
      totalDeVagalumes: pontos.vagalumes.length,
    })
    s.dizer(config.falaDoComeco)
  }
  useInterativo(`${ilhaId}:largada`, {
    x: largada.x,
    z: largada.z,
    raio: pontos ? 1.8 : 0,
    rotulo: () =>
      movimento.corrida?.situacao === 'correndo' || movimento.modo !== 'chao'
        ? null
        : config.rotuloDaLargada,
    agir: comecar,
  })

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    tempo.current += dt

    // O corte suave: escurece, leva o corpo, clareia.
    const corte = q.corte
    if (corte.fase === 'saindo') {
      corte.ms += dt * 1000
      if (corte.ms >= config.corteSaiMs) {
        pedidos.teleporte = { x: q.destino.x, y: q.destino.y, z: q.destino.z }
        pedidos.olharPara = q.olhar
        corte.fase = 'voltando'
        corte.ms = 0
        if (corte.comecar) comecar()
      }
    } else if (corte.fase === 'voltando') {
      corte.ms += dt * 1000
      if (corte.ms >= config.corteVoltaMs) corte.fase = 'nada'
    }

    // Pedidos da tela para este percurso: correr de novo ou parar (só uma ilha completa está
    // ativa por vez, mas as Nuvens têm duas corridas).
    const pedido =
      movimento.pedidoDoPercurso?.percurso === config.id ? movimento.pedidoDoPercurso.acao : null
    if (pedido) movimento.pedidoDoPercurso = null
    if (pedido === 'recomecar' && pontos && corte.fase === 'nada') {
      loja.getState().mostrarResultado(null)
      cortarPara(pontos.largada, pontos.rumoDaLargada, true)
    } else if (pedido === 'parar' && movimento.corrida) {
      fantasmas.cancelar(config.id)
      movimento.corrida = null
      loja.getState().definirCorrida(null)
      loja.getState().dizer(config.falaDoFim)
    }

    // Só a corrida deste percurso (as Nuvens têm duas: os saltos e a de balão).
    const c = loja.getState().corrida?.percurso === config.id ? movimento.corrida : null
    const mostrar = c?.situacao === 'correndo'
    for (let i = 0; i < coletaveis.current.length; i++) {
      const g = coletaveis.current[i]
      const p = pontos?.vagalumes[i]
      if (!g || !p) continue
      // O segredo (a terceira estrela, A9) só aparece de perto.
      g.visible = mostrar && !c?.pegos[i] && (i !== c?.segredo || segredoAparece(p, rastro))
      if (!g.visible) continue
      const sobe = menosMovimento ? 0 : Math.sin(tempo.current * 2.2 + i * 1.7) * 0.12
      g.position.set(p.x, p.y + sobe, p.z)
      const brilho = g.children[1] as Sprite | undefined
      if (brilho)
        brilho.material.opacity = menosMovimento
          ? 0.75
          : 0.6 + Math.sin(tempo.current * 4 + i) * 0.2
    }
    if (c?.situacao !== 'correndo' || !pontos) return
    const s = loja.getState()
    // Menu, tempo pausado ou corte na tela: o cronômetro espera (com uma ferramenta aberta ou a aba
    // escondida a cena nem desenha, então também não soma).
    if (jogoPausado(s) || corte.fase !== 'nada') return
    q.corpo.x = rastro.x
    q.corpo.y = rastro.y
    q.corpo.z = rastro.z
    q.corpo.pes = rastro.y - CORPO.doCentroAoPe
    // Cair na água (a lagoa dos corais, o mar da praia) também volta à última parada.
    q.corpo.noChaoDaIlha = (movimento.noChao && q.corpo.pes < alturaDoChao) || s.nadando
    // Só iniciar depois do corte e do teleporte: o relógio ativo ainda está em zero.
    if (c.tempoMs === 0) fantasmas.comecar(config.id, rastro)
    const ev = passoDaCorrida(c, q.corpo, pontos, dt * 1000, config)
    fantasmas.quadro(c.tempoMs, rastro)
    if (!ev) return
    if (ev.tipo === 'vagalume') {
      s.definirCorrida({
        percurso: config.id,
        vagalumes: vagalumesPegos(c),
        totalDeVagalumes: c.pegos.length,
      })
    } else if (ev.tipo === 'caiu') {
      const d = pontos.deques[ev.deque]
      if (d) cortarPara(d.volta, d.rumoDaVolta, false)
    } else if (ev.tipo === 'chegou') {
      movimento.corrida = null
      terminarCorrida(loja, config, c)
      fantasmas.terminar(config.id, c.tempoMs, rastro)
    } else if (ev.tipo === 'desistiu') {
      fantasmas.cancelar(config.id)
      movimento.corrida = null
      s.definirCorrida(null)
      s.dizer(config.falaDoFim)
    }
  })

  return (
    <>
      {pontos?.vagalumes.map((p, i) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: as coisas do caminho são fixas e na ordem
          key={i}
          ref={(g) => {
            coletaveis.current[i] = g
          }}
          position={[p.x, p.y, p.z]}
          visible={false}
        >
          <Coletavel cores={cores} />
        </group>
      ))}
    </>
  )
}

/**
 * A chegada de uma corrida: junta ao melhor de antes no salvamento, mostra o resultado e o Zappy fala. A corrida de balão
 * das Nuvens usa a mesma.
 */
export function terminarCorrida(loja: LojaDoJogo, config: ConfigDoPercurso, c: Corrida): void {
  const s = loja.getState()
  const id = config.id
  const antes = resultadoDoPercurso(s.salvamento.percursos, id)
  const melhor = juntarResultado(antes, c, config)
  if (!melhor) return
  /** A fala do prêmio, se a chegada trouxe um (escrita dentro do `mudar`). */
  const premio = { fala: '' }
  s.mudar((sv) => {
    const comResultado = {
      ...sv,
      percursos: { ...sv.percursos, [id]: compactarResultado(melhor) },
    }
    const p = config.premio?.(comResultado)
    if (!p) return comResultado
    premio.fala = p.fala
    return p.salvamento
  })
  const estrelas = estrelasDaCorrida(c, config)
  const recorde = antes !== undefined && c.tempoMs < antes.melhorTempoMs
  s.definirCorrida(null)
  s.mostrarResultado({
    percurso: id,
    tempoMs: c.tempoMs,
    estrelas,
    melhor,
    recorde,
    vagalumes: vagalumesPegos(c),
    totalDeVagalumes: c.pegos.length,
  })
  const n = quantasEstrelas(estrelas)
  const fala = recorde
    ? `Recorde novo: ${formatarTempo(c.tempoMs)}.`
    : n === 3
      ? config.falaDasTresEstrelas
      : `Você chegou ao fim em ${formatarTempo(c.tempoMs)}.`
  s.dizer(premio.fala ? `${fala} ${premio.fala}` : fala)
}

// ------------------------------------------------------------------ peças desenhadas no código

const NUCLEO = new SphereGeometry(0.09, 12, 8)
const materiaisDoNucleo = new Map<string, MeshBasicMaterial>()
const texturasDoBrilho = new Map<string, CanvasTexture>()

function materialDoNucleo(cor: string): MeshBasicMaterial {
  let m = materiaisDoNucleo.get(cor)
  if (!m) {
    m = new MeshBasicMaterial({ color: cor, toneMapped: false })
    materiaisDoNucleo.set(cor, m)
  }
  return m
}

/** A textura do brilho: um círculo que some para as bordas (feita uma vez por degradê). */
function texturaDoBrilho(degrade: CoresDoColetavel['degrade']): CanvasTexture | null {
  const chave = degrade.join('|')
  const pronta = texturasDoBrilho.get(chave)
  if (pronta) return pronta
  if (typeof document === 'undefined') return null
  const tela = document.createElement('canvas')
  tela.width = 64
  tela.height = 64
  const ctx = tela.getContext('2d')
  if (!ctx) return null
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, degrade[0])
  grad.addColorStop(0.35, degrade[1])
  grad.addColorStop(1, degrade[2])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  const textura = new CanvasTexture(tela)
  texturasDoBrilho.set(chave, textura)
  return textura
}

/** O pontinho aceso e o brilho em volta (sempre virado para a câmera). */
export function Coletavel({ cores }: { cores: CoresDoColetavel }) {
  const material = useMemo(
    () =>
      new SpriteMaterial({
        map: texturaDoBrilho(cores.degrade),
        color: cores.brilho,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.7,
      }),
    [cores],
  )
  useEffect(() => () => material.dispose(), [material])
  return (
    <>
      <mesh geometry={NUCLEO} material={materialDoNucleo(cores.nucleo)} />
      <sprite material={material} scale={[0.95, 0.95, 0.95]} />
    </>
  )
}
