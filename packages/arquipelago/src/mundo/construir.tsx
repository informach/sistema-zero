import { useFrame, useThree } from '@react-three/fiber'
import type { Obra } from '@sistemazero/arquipelago-contracts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BufferGeometry, Float32BufferAttribute, Plane, Raycaster, Vector2, Vector3 } from 'three'
import { CAMERA_DE_OBRA, lojaDaConstrucao, useConstrucao } from '../estado/construcao'
import { useJogo } from '../estado/contexto'
import { planta } from '../sistemas/construcao/comodos'
import {
  type Aresta,
  aberturaNaAresta,
  arestaMaisPerto,
  arestasDaAbertura,
  arestasDoArrasto,
  celulaEm,
  type Ponto,
  pontoMaisPerto,
} from '../sistemas/construcao/grade'
import { type Celula, chaveDaCelula, type Lote } from '../sistemas/construcao/lote'
import {
  aberturaEm,
  apagarParede,
  esticarParede,
  porAbertura,
  tirarAbertura,
  trocarPiso,
} from '../sistemas/construcao/obra'

const VERDE = '#3ccf7a'
const VERMELHO = '#e2475f'
const AZUL = '#4aa3ff'

/** O que a prévia mostra embaixo do dedo (ou do mouse). */
type Previa =
  | { tipo: 'arestas'; arestas: Aresta[]; cor: string }
  | { tipo: 'celulas'; celulas: Celula[]; cor: string }
  | { tipo: 'ponto'; ponto: Ponto }
  | null

function chaveDaPrevia(p: Previa): string {
  if (!p) return ''
  if (p.tipo === 'ponto') return `p${p.ponto.x},${p.ponto.z}`
  const itens =
    p.tipo === 'arestas'
      ? p.arestas.map((a) => `${a.eixo}${a.x},${a.z}`)
      : p.celulas.map(chaveDaCelula)
  return `${p.tipo}${p.cor}${itens.join(';')}`
}

/**
 * O modo Construir dentro da cena (montado pela `Casa` só com o Construir aberto): a câmera de obra
 * por cima da câmera do jogo, a grade do lote, o toque e o arrasto das ferramentas e a prévia do que
 * vai acontecer (verde dá, vermelho não dá). O toque e a roda são pegos antes de chegarem à câmera
 * do jogo, que fica parada enquanto isso.
 */
export function ModoConstruir({ lote, obra, base }: { lote: Lote; obra: Obra; base: number }) {
  const { loja } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const [previa, setPrevia] = useState<Previa>(null)
  const ultimaPrevia = useRef('')
  const obraAtual = useRef(obra)
  obraAtual.current = obra

  const mostrar = useCallback((p: Previa) => {
    const k = chaveDaPrevia(p)
    if (k === ultimaPrevia.current) return
    ultimaPrevia.current = k
    setPrevia(p)
  }, [])

  // ------------------------------------------------------------ câmera de obra
  const teclas = useRef(new Set<string>())
  const desejada = useMemo(() => new Vector3(), [])
  // A posição da câmera de obra, suavizada aqui: a câmera do jogo escreve a dela a cada quadro antes
  // desta, então suavizar a partir de `camera.position` faria as duas brigarem. Começa de onde a
  // câmera do jogo estava (a troca é suave) e, ao fechar, a do jogo volta suave daqui.
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
    const h = Math.cos(c.inclinacao) * c.distancia
    desejada.set(
      c.alvo.x + Math.sin(c.giro) * h,
      base + Math.sin(c.inclinacao) * c.distancia,
      c.alvo.z + Math.cos(c.giro) * h,
    )
    atual.lerp(desejada, 1 - Math.exp(-dt * 8))
    camera.position.copy(atual)
    camera.lookAt(c.alvo.x, base, c.alvo.z)
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
      return raio.ray.intersectPlane(chao, ponto) ? { x: ponto.x, z: ponto.z } : null
    }
    type Gesto =
      | { tipo: 'olhar'; id: number; antes: { x: number; y: number }; girar: boolean }
      | {
          tipo: 'linha'
          id: number
          inicio: Ponto
          fim: Ponto
          andou: boolean
          toque: { x: number; z: number }
        }
      | { tipo: 'toque'; id: number; onde: { x: number; z: number } }
    let gesto: Gesto | null = null

    const previaDaLinha = (inicio: Ponto, fim: Ponto, apagar: boolean): Previa => {
      const arestas = arestasDoArrasto(inicio, fim)
      if (arestas.length === 0) return { tipo: 'ponto', ponto: inicio }
      const o = obraAtual.current
      const r = apagar ? apagarParede(o, lote, arestas) : esticarParede(o, lote, inicio, fim)
      return { tipo: 'arestas', arestas, cor: apagar ? VERMELHO : r.ok ? VERDE : VERMELHO }
    }

    const previaDoToque = (onde: { x: number; z: number }): Previa => {
      const s = construcao.getState()
      const o = obraAtual.current
      if (s.ferramenta === 'piso') {
        const p = planta(o, lote)
        const i = p.comodoDe.get(chaveDaCelula(celulaEm(onde.x, onde.z)))
        const comodo = i === undefined ? undefined : p.comodos[i]
        if (!comodo) return { tipo: 'celulas', celulas: [celulaEm(onde.x, onde.z)], cor: VERMELHO }
        return { tipo: 'celulas', celulas: comodo.celulas, cor: comodo.quarto ? VERMELHO : VERDE }
      }
      const aresta = arestaMaisPerto(onde.x, onde.z)
      if (s.ferramenta === 'porta' || s.ferramenta === 'janela') {
        const tipo = s.ferramenta === 'porta' ? 'porta' : s.janela
        const r = porAbertura(o, lote, tipo, aresta)
        return {
          tipo: 'arestas',
          arestas: arestasDaAbertura(aberturaNaAresta(tipo, aresta)),
          cor: r.ok ? AZUL : VERMELHO,
        }
      }
      if (s.ferramenta === 'apagar') {
        const i = aberturaEm(o, aresta)
        const ab = o.aberturas[i]
        return { tipo: 'arestas', arestas: ab ? arestasDaAbertura(ab) : [aresta], cor: VERMELHO }
      }
      return { tipo: 'ponto', ponto: pontoMaisPerto(onde.x, onde.z) }
    }

    const desce = (e: PointerEvent) => {
      e.stopPropagation()
      if (gesto) return
      const s = construcao.getState()
      const girar = e.button === 2
      if (girar || s.ferramenta === 'olhar') {
        gesto = { tipo: 'olhar', id: e.pointerId, antes: { x: e.clientX, y: e.clientY }, girar }
      } else {
        const onde = noChao(e)
        if (!onde) return
        if (s.ferramenta === 'parede' || s.ferramenta === 'apagar') {
          const p = pontoMaisPerto(onde.x, onde.z)
          gesto = { tipo: 'linha', id: e.pointerId, inicio: p, fim: p, andou: false, toque: onde }
        } else gesto = { tipo: 'toque', id: e.pointerId, onde }
      }
      el.setPointerCapture?.(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      e.stopPropagation()
      const s = construcao.getState()
      if (gesto?.tipo === 'olhar' && gesto.id === e.pointerId) {
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
      if (gesto?.tipo === 'linha' && gesto.id === e.pointerId) {
        gesto.fim = pontoMaisPerto(onde.x, onde.z)
        if (gesto.fim.x !== gesto.inicio.x || gesto.fim.z !== gesto.inicio.z) gesto.andou = true
        mostrar(previaDaLinha(gesto.inicio, gesto.fim, s.ferramenta === 'apagar'))
        return
      }
      if (!gesto && s.ferramenta !== 'olhar') {
        mostrar(
          s.ferramenta === 'parede'
            ? { tipo: 'ponto', ponto: pontoMaisPerto(onde.x, onde.z) }
            : previaDoToque(onde),
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
      if (g.tipo === 'linha') {
        if (s.ferramenta === 'parede') {
          if (g.andou) s.aplicar(esticarParede(o, lote, g.inicio, g.fim))
        } else if (g.andou) s.aplicar(apagarParede(o, lote, arestasDoArrasto(g.inicio, g.fim)))
        else {
          // Um toque só no apagar: tira a porta ou janela dali; sem ela, a parede.
          const aresta = arestaMaisPerto(g.toque.x, g.toque.z)
          s.aplicar(
            aberturaEm(o, aresta) >= 0 ? tirarAbertura(o, aresta) : apagarParede(o, lote, [aresta]),
          )
        }
        mostrar(null)
        return
      }
      if (g.tipo === 'toque') {
        if (s.ferramenta === 'piso')
          s.aplicar(trocarPiso(o, lote, celulaEm(g.onde.x, g.onde.z), s.piso))
        else if (s.ferramenta === 'porta' || s.ferramenta === 'janela')
          s.aplicar(
            porAbertura(
              o,
              lote,
              s.ferramenta === 'porta' ? 'porta' : s.janela,
              arestaMaisPerto(g.onde.x, g.onde.z),
            ),
          )
        mostrar(null)
      }
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
    el.addEventListener('pointercancel', sobe, opcoes)
    el.addEventListener('pointerleave', sai)
    el.addEventListener('wheel', roda, { capture: true, passive: false })
    el.addEventListener('contextmenu', semMenu, opcoes)
    return () => {
      el.removeEventListener('pointerdown', desce, opcoes)
      el.removeEventListener('pointermove', move, opcoes)
      el.removeEventListener('pointerup', sobe, opcoes)
      el.removeEventListener('pointercancel', sobe, opcoes)
      el.removeEventListener('pointerleave', sai)
      el.removeEventListener('wheel', roda, opcoes)
      el.removeEventListener('contextmenu', semMenu, opcoes)
    }
  }, [gl, camera, base, lote, construcao, mostrar])

  // A prévia some quando a ferramenta muda.
  const ferramenta = useConstrucao(construcao, (s) => s.ferramenta)
  // biome-ignore lint/correctness/useExhaustiveDependencies: limpar a prévia a cada troca de ferramenta.
  useEffect(() => {
    ultimaPrevia.current = ''
    setPrevia(null)
  }, [ferramenta])

  return (
    <group position={[0, base, 0]}>
      <Grade lote={lote} />
      <Previa previa={previa} />
    </group>
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

/** As linhas da grade do lote e o que já está ocupado (tingido). */
function Grade({ lote }: { lote: Lote }) {
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
