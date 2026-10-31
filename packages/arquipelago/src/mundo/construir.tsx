import { useFrame, useThree } from '@react-three/fiber'
import type { Obra } from '@sistemazero/arquipelago-contracts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BufferGeometry, Float32BufferAttribute, Plane, Raycaster, Vector2, Vector3 } from 'three'
import { CAMERA_DE_OBRA, lojaDaConstrucao, useConstrucao } from '../estado/construcao'
import { useJogo } from '../estado/contexto'
import { planta } from '../sistemas/construcao/comodos'
import { motivoDaPrevia } from '../sistemas/construcao/falas'
import {
  arrasta,
  arrasto,
  type Ferramenta,
  type Previa as PreviaDaRegra,
  toque,
} from '../sistemas/construcao/ferramentas'
import { type Aresta, arestaDaChave, celulaEm, type Ponto } from '../sistemas/construcao/grade'
import { type Celula, chaveDaCelula, type Lote } from '../sistemas/construcao/lote'
import type { Resultado } from '../sistemas/construcao/obra'
import { noModelo } from './medidas'

const VERDE = '#3ccf7a'
const VERMELHO = '#e2475f'
const AZUL = '#4aa3ff'
/** Tolera a tremida do dedo sem confundir o toque de inspeção com arrastar a câmera. */
const DISTANCIA_DO_ARRASTO = 6

/** O que a prévia mostra embaixo do dedo (ou do mouse). */
type Previa =
  | { tipo: 'arestas'; arestas: Aresta[]; cor: string }
  | { tipo: 'celulas'; celulas: Celula[]; cor: string }
  | { tipo: 'ponto'; ponto: Ponto }
  | null

/** A cor da prévia: vermelho no apagar e no que não dá; azul na porta e na janela; verde no resto. */
function comCor(f: Ferramenta, p: PreviaDaRegra): Previa {
  if (p.tipo === 'ponto') return p
  const cor = f === 'apagar' || !p.ok ? VERMELHO : f === 'porta' || f === 'janela' ? AZUL : VERDE
  return p.tipo === 'arestas'
    ? { tipo: 'arestas', arestas: p.arestas, cor }
    : { tipo: 'celulas', celulas: p.celulas, cor }
}

function chaveDaPrevia(p: Previa): string {
  if (!p) return ''
  if (p.tipo === 'ponto') return `p${p.ponto.x},${p.ponto.z}`
  const itens =
    p.tipo === 'arestas'
      ? p.arestas.map((a) => `${a.eixo}${a.x},${a.z}`)
      : p.celulas.map(chaveDaCelula)
  return `${p.tipo}${p.cor}${itens.join(';')}`
}

/** Onde fica a grade no mundo: o ponto (0, 0) e o giro em volta do y (a de uma cabana gira com a ilha). */
export interface ReferencialDaObra {
  x: number
  z: number
  giro: number
}

const NO_MUNDO: ReferencialDaObra = { x: 0, z: 0, giro: 0 }

/**
 * O modo Construir dentro da cena (montado pela `Casa` só com o Construir aberto): a câmera de obra
 * por cima da câmera do jogo, a grade do lote, o toque e o arrasto das ferramentas e a prévia do que
 * vai acontecer (verde dá, vermelho não dá). O toque e a roda são pegos antes de chegarem à câmera
 * do jogo, que fica parada enquanto isso.
 */
export function ModoConstruir({
  lote,
  obra,
  base,
  referencial = NO_MUNDO,
}: {
  lote: Lote
  obra: Obra
  base: number
  referencial?: ReferencialDaObra
}) {
  const { loja } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const ferramenta = useConstrucao(construcao, (s) => s.ferramenta)
  const aconchegoAberto = useConstrucao(construcao, (s) => s.aconchegoAberto)
  const celulaObservada = useConstrucao(construcao, (s) => s.celulaObservada)
  const comodoObservado = useMemo(() => {
    if (!aconchegoAberto) return undefined
    const p = planta(obra, lote)
    const i = celulaObservada ? p.comodoDe.get(chaveDaCelula(celulaObservada)) : 0
    return i === undefined ? undefined : p.comodos[i]
  }, [obra, lote, aconchegoAberto, celulaObservada])
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const [previa, setPrevia] = useState<Previa>(null)
  const ultimaPrevia = useRef('')
  const obraAtual = useRef(obra)
  obraAtual.current = obra

  const mostrar = useCallback(
    (p: Previa) => {
      // Sem prévia, a linha de baixo volta à dica da ferramenta.
      if (!p) construcao.getState().mostrarMotivo(null)
      const k = chaveDaPrevia(p)
      if (k === ultimaPrevia.current) return
      ultimaPrevia.current = k
      setPrevia(p)
    },
    [construcao],
  )
  // A prévia e o motivo dela, juntos: vermelha, a linha de baixo diz por que não dá (o mesmo texto
  // que o Zappy diria no toque), antes de a criança tocar.
  const mostrarComMotivo = useCallback(
    (f: Ferramenta, r: { resultado: Resultado | null; previa: PreviaDaRegra }) => {
      mostrar(comCor(f, r.previa))
      construcao.getState().mostrarMotivo(motivoDaPrevia(r.resultado))
    },
    [construcao, mostrar],
  )

  // ------------------------------------------------------------ câmera de obra
  const teclas = useRef(new Set<string>())
  const desejada = useMemo(() => new Vector3(), [])
  // O Construir assume a câmera enquanto aberto; a de exploração suspende seus controles.
  // Começa da posição anterior e, ao fechar, a exploração volta suave daqui.
  const atual = useMemo(() => camera.position.clone(), [camera])
  useFrame((_, dt) => {
    const c = construcao.getState().camera
    // Setas e WASD andam pela obra (para onde a câmera olha); Q e E giram.
    const t = teclas.current
    const frente =
      (t.has('KeyW') || t.has('ArrowUp') ? 1 : 0) - (t.has('KeyS') || t.has('ArrowDown') ? 1 : 0)
    const lado =
      (t.has('KeyD') || t.has('ArrowRight') ? 1 : 0) - (t.has('KeyA') || t.has('ArrowLeft') ? 1 : 0)
    const giro = (t.has('KeyE') ? 1 : 0) - (t.has('KeyQ') ? 1 : 0)
    if (frente || lado || giro) {
      const v = CAMERA_DE_OBRA.rapidez * dt
      const sin = Math.sin(c.giro)
      const cos = Math.cos(c.giro)
      construcao.getState().moverCamera({
        alvo: limitarAlvo(lote, {
          x: c.alvo.x - sin * frente * v + cos * lado * v,
          z: c.alvo.z - cos * frente * v - sin * lado * v,
        }),
        giro: c.giro + giro * dt * 1.6,
      })
    }
    // A órbita é calculada na grade e levada para o mundo pelo referencial.
    const h = Math.cos(c.inclinacao) * c.distancia
    const { x: rx, z: rz, giro: g } = referencial
    const cg = Math.cos(g)
    const sg = Math.sin(g)
    const lx = c.alvo.x + Math.sin(c.giro) * h
    const lz = c.alvo.z + Math.cos(c.giro) * h
    desejada.set(
      rx + lx * cg + lz * sg,
      base + Math.sin(c.inclinacao) * c.distancia,
      rz - lx * sg + lz * cg,
    )
    atual.lerp(desejada, 1 - Math.exp(-dt * 8))
    camera.position.copy(atual)
    camera.lookAt(rx + c.alvo.x * cg + c.alvo.z * sg, base, rz - c.alvo.x * sg + c.alvo.z * cg)
  })

  useEffect(() => {
    const desce = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest?.('input, textarea, select, [contenteditable=true]')) return
      teclas.current.add(e.code)
    }
    const sobe = (e: KeyboardEvent) => teclas.current.delete(e.code)
    const solta = () => teclas.current.clear()
    window.addEventListener('keydown', desce)
    window.addEventListener('keyup', sobe)
    window.addEventListener('blur', solta)
    return () => {
      window.removeEventListener('keydown', desce)
      window.removeEventListener('keyup', sobe)
      window.removeEventListener('blur', solta)
    }
  }, [])

  // ------------------------------------------------------------ toque, arrasto e roda
  useEffect(() => {
    const el = gl.domElement.parentElement ?? gl.domElement
    const raio = new Raycaster()
    const ndc = new Vector2()
    const chao = new Plane(new Vector3(0, 1, 0), -base)
    const ponto = new Vector3()
    const noChao = (e: PointerEvent | WheelEvent): { x: number; z: number } | null => {
      const r = gl.domElement.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      raio.setFromCamera(ndc, camera)
      if (!raio.ray.intersectPlane(chao, ponto)) return null
      return noModelo(ponto.x - referencial.x, ponto.z - referencial.z, referencial.giro)
    }
    type Gesto =
      | {
          tipo: 'olhar'
          id: number
          antes: { x: number; y: number }
          inicio: { x: number; y: number }
          andou: boolean
          girar: boolean
        }
      | {
          tipo: 'arrasto'
          id: number
          inicio: { x: number; z: number }
          fim: { x: number; z: number }
          andou: boolean
        }
      | { tipo: 'toque'; id: number; onde: { x: number; z: number } }
    let gesto: Gesto | null = null
    const cancelar = () => {
      const anterior = gesto
      gesto = null
      if (anterior && el.hasPointerCapture?.(anterior.id)) el.releasePointerCapture(anterior.id)
      mostrar(null)
    }
    const cancelarPonteiro = (e: PointerEvent) => {
      if (gesto?.id === e.pointerId) cancelar()
    }
    const escolhas = () => {
      const s = construcao.getState()
      return {
        janela: s.janela,
        piso: s.piso,
        caminho: s.caminho,
        objeto: s.objeto,
        movel: s.movel,
        giro: s.giro,
      }
    }
    const horta = () => loja.getState().salvamento.horta
    const projetos = () => loja.getState().salvamento.projetos

    const desce = (e: PointerEvent) => {
      e.stopPropagation()
      if (gesto) return
      const girar = e.button === 2
      if (girar || ferramenta === 'olhar') {
        gesto = {
          tipo: 'olhar',
          id: e.pointerId,
          antes: { x: e.clientX, y: e.clientY },
          inicio: { x: e.clientX, y: e.clientY },
          andou: false,
          girar,
        }
      } else {
        const onde = noChao(e)
        if (!onde) return
        gesto = arrasta(ferramenta)
          ? { tipo: 'arrasto', id: e.pointerId, inicio: onde, fim: onde, andou: false }
          : { tipo: 'toque', id: e.pointerId, onde }
      }
      el.setPointerCapture?.(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      e.stopPropagation()
      const s = construcao.getState()
      if (gesto?.tipo === 'olhar' && gesto.id === e.pointerId) {
        if (
          Math.hypot(e.clientX - gesto.inicio.x, e.clientY - gesto.inicio.y) > DISTANCIA_DO_ARRASTO
        )
          gesto.andou = true
        if (!gesto.andou) return
        const dx = e.clientX - gesto.antes.x
        const dy = e.clientY - gesto.antes.y
        gesto.antes = { x: e.clientX, y: e.clientY }
        const c = s.camera
        if (gesto.girar) {
          s.moverCamera({
            giro: c.giro - dx * 0.006,
            inclinacao: Math.min(1.35, Math.max(0.45, c.inclinacao + dy * 0.004)),
          })
        } else {
          // Arrastar a mão anda pela obra: o chão acompanha o dedo.
          const k = c.distancia / 700
          const sin = Math.sin(c.giro)
          const cos = Math.cos(c.giro)
          s.moverCamera({
            alvo: limitarAlvo(lote, {
              x: c.alvo.x - cos * dx * k - sin * dy * k,
              z: c.alvo.z + sin * dx * k - cos * dy * k,
            }),
          })
        }
        return
      }
      const onde = noChao(e)
      if (!onde) return
      const o = obraAtual.current
      if (gesto?.tipo === 'arrasto' && gesto.id === e.pointerId) {
        gesto.fim = onde
        if (Math.hypot(onde.x - gesto.inicio.x, onde.z - gesto.inicio.z) > 0.35) gesto.andou = true
        mostrarComMotivo(ferramenta, arrasto(ferramenta, o, lote, gesto.inicio, onde, escolhas()))
        return
      }
      if (!gesto && ferramenta !== 'olhar') {
        // Antes de arrastar, a prévia é a do toque (no apagar, o que um toque tiraria).
        const f = ferramenta
        mostrarComMotivo(
          f,
          arrasta(f) && f !== 'apagar'
            ? arrasto(f, o, lote, onde, onde, escolhas())
            : toque(f, o, lote, onde, escolhas(), horta(), projetos()),
        )
      }
    }
    const sobe = (e: PointerEvent) => {
      e.stopPropagation()
      if (!gesto || gesto.id !== e.pointerId) return
      const g = gesto
      gesto = null
      el.releasePointerCapture?.(e.pointerId)
      const s = construcao.getState()
      const o = obraAtual.current
      if (g.tipo === 'olhar' && !g.girar && !g.andou) {
        const onde = noChao(e)
        if (onde) s.observarComodo(celulaEm(onde.x, onde.z))
      } else if (g.tipo === 'arrasto') {
        const f = ferramenta
        // Sem arrastar: o apagar tira o que está ali; o caminho pinta uma célula.
        const r =
          g.andou || f === 'caminho'
            ? arrasto(f, o, lote, g.inicio, g.fim, escolhas()).resultado
            : f === 'apagar'
              ? toque(f, o, lote, g.inicio, escolhas(), horta(), projetos()).resultado
              : null
        if (r) s.aplicar(r)
      } else if (g.tipo === 'toque') {
        const r = toque(ferramenta, o, lote, g.onde, escolhas(), horta(), projetos()).resultado
        if (r) s.aplicar(r)
      }
      mostrar(null)
    }
    const roda = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const s = construcao.getState()
      s.moverCamera({
        distancia: Math.min(
          CAMERA_DE_OBRA.distanciaMaxima,
          Math.max(CAMERA_DE_OBRA.distanciaMinima, s.camera.distancia + e.deltaY * 0.02),
        ),
      })
    }
    const semMenu = (e: Event) => e.preventDefault()
    const sai = () => mostrar(null)
    const opcoes = { capture: true }
    el.addEventListener('pointerdown', desce, opcoes)
    el.addEventListener('pointermove', move, opcoes)
    el.addEventListener('pointerup', sobe, opcoes)
    el.addEventListener('pointercancel', cancelarPonteiro, opcoes)
    el.addEventListener('lostpointercapture', cancelarPonteiro, opcoes)
    window.addEventListener('blur', cancelar)
    el.addEventListener('pointerleave', sai)
    el.addEventListener('wheel', roda, { capture: true, passive: false })
    el.addEventListener('contextmenu', semMenu, opcoes)
    return () => {
      el.removeEventListener('pointerdown', desce, opcoes)
      el.removeEventListener('pointermove', move, opcoes)
      el.removeEventListener('pointerup', sobe, opcoes)
      el.removeEventListener('pointercancel', cancelarPonteiro, opcoes)
      el.removeEventListener('lostpointercapture', cancelarPonteiro, opcoes)
      window.removeEventListener('blur', cancelar)
      el.removeEventListener('pointerleave', sai)
      el.removeEventListener('wheel', roda, opcoes)
      el.removeEventListener('contextmenu', semMenu, opcoes)
      cancelar()
    }
  }, [gl, camera, base, lote, construcao, mostrar, mostrarComMotivo, loja, ferramenta, referencial])

  // A prévia some quando a ferramenta muda.
  // biome-ignore lint/correctness/useExhaustiveDependencies: limpar a prévia a cada troca de ferramenta.
  useEffect(() => {
    ultimaPrevia.current = ''
    setPrevia(null)
  }, [ferramenta])
  // Fechando o Construir, a linha de baixo não guarda o motivo da última prévia.
  useEffect(() => () => construcao.getState().mostrarMotivo(null), [construcao])

  return (
    <group position={[referencial.x, base, referencial.z]} rotation-y={referencial.giro}>
      <Grade lote={lote} />
      {comodoObservado && <DestaqueDoComodo celulas={comodoObservado.celulas} />}
      <Previa previa={previa} />
    </group>
  )
}

/** Uma única malha leve identifica o cômodo inspecionado, mesmo quando não é retangular. */
function DestaqueDoComodo({ celulas }: { celulas: Celula[] }) {
  const geometria = useMemo(() => {
    const vertices: number[] = []
    for (const { x, z } of celulas) {
      vertices.push(
        x,
        0.08,
        z,
        x,
        0.08,
        z + 1,
        x + 1,
        0.08,
        z + 1,
        x,
        0.08,
        z,
        x + 1,
        0.08,
        z + 1,
        x + 1,
        0.08,
        z,
      )
    }
    return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices, 3))
  }, [celulas])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh geometry={geometria}>
      <meshBasicMaterial color="#ffc93c" transparent opacity={0.25} depthWrite={false} />
    </mesh>
  )
}

/** O alvo da câmera não sai de perto do lote. */
function limitarAlvo(lote: Lote, a: { x: number; z: number }) {
  const { x0, z0, x1, z1 } = lote.area
  return {
    x: Math.min(x1 + 4, Math.max(x0 - 4, a.x)),
    z: Math.min(z1 + 4, Math.max(z0 - 4, a.z)),
  }
}

/** Um pouco acima do topo da parede cortada (1 de altura): a marca do quadro do Meu quarto. */
const ACIMA_DA_PAREDE_CORTADA = 1.03

/**
 * As linhas da grade do lote e o que já está ocupado (tingido). Os quadros e as prateleiras do Meu
 * quarto saem com as paredes cortadas: uma faixa tingida em cima da parede marca onde eles ficam
 * (porta e janela não vão ali).
 */
function Grade({ lote }: { lote: Lote }) {
  const pendurados = useMemo(
    () => [...(lote.penduradosDoQuarto ?? [])].map(arestaDaChave),
    [lote.penduradosDoQuarto],
  )
  const linhas = useMemo(() => {
    const { x0, z0, x1, z1 } = lote.area
    const v: number[] = []
    for (let x = x0; x <= x1; x++) v.push(x, 0.03, z0, x, 0.03, z1)
    for (let z = z0; z <= z1; z++) v.push(x0, 0.03, z, x1, 0.03, z)
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(v, 3))
    return g
  }, [lote])
  return (
    <>
      <lineSegments geometry={linhas}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.45} depthWrite={false} />
      </lineSegments>
      {lote.ocupadas.map((o) => (
        <mesh
          key={`${o.ret.x0},${o.ret.z0}`}
          position={[(o.ret.x0 + o.ret.x1) / 2, 0.04, (o.ret.z0 + o.ret.z1) / 2]}
          rotation-x={-Math.PI / 2}
        >
          <planeGeometry args={[o.ret.x1 - o.ret.x0, o.ret.z1 - o.ret.z0]} />
          <meshBasicMaterial color="#e2475f" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ))}
      {pendurados.map((a) => (
        <mesh
          key={`${a.eixo}${a.x},${a.z}`}
          position={
            a.eixo === 'x'
              ? [a.x + 0.5, ACIMA_DA_PAREDE_CORTADA, a.z]
              : [a.x, ACIMA_DA_PAREDE_CORTADA, a.z + 0.5]
          }
          rotation-x={-Math.PI / 2}
        >
          <planeGeometry args={a.eixo === 'x' ? [0.9, 0.3] : [0.3, 0.9]} />
          <meshBasicMaterial color="#e2475f" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

function Previa({ previa }: { previa: Previa }) {
  if (!previa) return null
  if (previa.tipo === 'ponto')
    return (
      <mesh position={[previa.ponto.x, 0.08, previa.ponto.z]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 16]} />
        <meshBasicMaterial color={VERDE} />
      </mesh>
    )
  if (previa.tipo === 'celulas')
    return (
      <>
        {previa.celulas.map((c) => (
          <mesh
            key={chaveDaCelula(c)}
            position={[c.x + 0.5, 0.06, c.z + 0.5]}
            rotation-x={-Math.PI / 2}
          >
            <planeGeometry args={[0.96, 0.96]} />
            <meshBasicMaterial color={previa.cor} transparent opacity={0.4} depthWrite={false} />
          </mesh>
        ))}
      </>
    )
  return (
    <>
      {previa.arestas.map((a) => (
        <mesh
          key={`${a.eixo}${a.x},${a.z}`}
          position={a.eixo === 'x' ? [a.x + 0.5, 0.6, a.z] : [a.x, 0.6, a.z + 0.5]}
        >
          <boxGeometry args={a.eixo === 'x' ? [1, 1.2, 0.26] : [0.26, 1.2, 1]} />
          <meshBasicMaterial color={previa.cor} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}
