'use client'
/**
 * O palco da porta com o não (Ilha do Farol, aula 3) NA ILHA 3D DO JOGO DO CURSO (08/11/2026).
 *
 * ⭐ Pedido dela: "se é um jogo 3D em que a gente está trabalhando, a cena deveria ser 3D também do
 * jogo em que a gente está trabalhando naquele curso". A cena é a mesma das aulas 1 e 2 (o `.glb`
 * de `gerar-ilha-artes.ts`, por `carregarIlhaDoJogo`), com o que o jogo da Ilha faz
 * (`ilha-do-farol-projeto.ts`): o personagem anda pelas `walkArea` do jogo (a ilha, a ponte e a
 * ilhota do farol, sem atravessar as pedras nem o farol), encostar na chave a pega (ela some, como o
 * `setVisible(chave, "hide")`), e encostar no farol é a porta perguntar. Aberta, o farol acende e o
 * barco vem ao cais (o `moveTowards` do jogo). O aviso do alto é o `hudText` do jogo.
 *
 * ⚠️ A câmera é a do jogo (`frameScene`: de cima e de lado, acompanhando o personagem de leve),
 * girada para a esquerda (`VISTA.az`) para a chave e o personagem não ficarem atrás das pedras:
 * aqui o assunto é o "não", e procurar a chave escondida é a aula 1. As setas andam em relação a
 * esta câmera, com a mesma conta do runtime do Jogo 3D (`controlWithKeys`).
 */
import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import type { Direcao } from './scene-discovery-frame'
import { carregarIlhaDoJogo } from './scene-ilha-glb'

export type Ponto = { x: number; z: number }
export type BalaoDaIlha = { texto: string; tom: 'pergunta' | 'sim' | 'nao' }

/** Os lugares do jogo da Ilha (`ilha-do-farol-projeto.ts` e `gerar-ilha-artes.ts`). */
export const INICIO: Ponto = { x: -6.5, z: 0.75 }
export const CHAVE: Ponto = { x: -3, z: -2 }
const CHAVE_Y = 1
export const FAROL: Ponto = { x: 5.2, z: 0.1 }
const PEDRAS: Ponto = { x: -2, z: -1 }
const BARCO = { x: 8.5, y: -0.1, z: 4.5 }
const BARCO_NO_CAIS = 6.6
/** As `walkArea` do jogo: a ilha, a ponte e a ilhota do farol. */
const AREAS = [
  { x0: -11, x1: 1, z0: -5, z1: 5 },
  { x0: 0.6, x1: 4.1, z0: 0.4, z1: 1.1 },
  { x0: 4, x1: 6.1, z0: -0.5, z1: 1.7 },
] as const
export const dist = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.z - b.z)
/** Onde o personagem pode estar: dentro de uma área e fora das pedras e do farol (sólidos). */
export const podeAndarNaIlha = (p: Ponto) =>
  AREAS.some((a) => p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1) &&
  dist(p, PEDRAS) > 0.95 &&
  dist(p, FAROL) > 0.75
/**
 * A vista: como a do jogo (`frameScene`), acompanhando o personagem de leve, mas girada um pouco
 * (az) para a chave não ficar atrás das pedras. Aqui o assunto é o "não"; procurar a chave escondida
 * é a aula 1. As setas andam em relação a esta câmera, como no jogo (`controlWithKeys`).
 */
export const VISTA = { az: -0.95, el: 0.95, dist: 18.8 } as const
export const ENCOSTA_CHAVE = 1
export const ENCOSTA_FAROL = 1.5
export const LONGE_DO_FAROL = 3
export const PERTO_DO_FAROL = 4.5

/** Os textos do aviso do jogo (o `hudText` do alto). */
export const AVISOS = {
  inicio: 'Encontre a chave e leve o personagem até o farol.',
  coleta: 'Você pegou a chave! Agora vá ao farol.',
  acendeu: 'Você acendeu o farol! O barco pode chegar.',
  falta: 'Falta a chave. Procure na ilha antes de voltar.',
  apagado: 'O farol continua apagado.',
} as const

/**
 * Para onde as setas levam, girando com a câmera: a MESMA conta do runtime do Jogo 3D
 * (`controlWithKeys` no modo `framed`). `ix` é → menos ←, `iz` é ↓ menos ↑ ("para cima" é para longe
 * da câmera).
 */
export function setasNaVista(ix: number, iz: number) {
  const ca = Math.cos(VISTA.az)
  const sa = Math.sin(VISTA.az)
  return { vx: ix * ca + iz * sa, vz: iz * ca - ix * sa }
}

/** O andar do jogo 3D: as setas andam no chão (x e z), com a velocidade do `topDown` (4). */
export function useAndar3D(inicio: Ponto, velocidade = 4) {
  const [pos, setPos] = useState(inicio)
  const [rumo, setRumo] = useState(Math.PI / 2)
  const [segurando, setSegurando] = useState<ReadonlySet<Direcao>>(new Set())
  const dirs = useRef(new Set<Direcao>())
  const quadro = useRef<number | null>(null)
  const ultimo = useRef(0)
  const passo = (agora: number) => {
    const dt = Math.min(0.05, (agora - ultimo.current) / 1000)
    ultimo.current = agora
    const d = dirs.current
    const ix = (d.has('direita') ? 1 : 0) - (d.has('esquerda') ? 1 : 0)
    const iz = (d.has('baixo') ? 1 : 0) - (d.has('cima') ? 1 : 0)
    const { vx, vz } = setasNaVista(ix, iz)
    const norma = ix && iz ? Math.SQRT1_2 : 1
    if (vx || vz) {
      setRumo(Math.atan2(vx, vz))
      setPos((p) => {
        const nx = p.x + vx * velocidade * norma * dt
        const nz = p.z + vz * velocidade * norma * dt
        const x = podeAndarNaIlha({ x: nx, z: p.z }) ? nx : p.x
        const z = podeAndarNaIlha({ x, z: nz }) ? nz : p.z
        return x === p.x && z === p.z ? p : { x, z }
      })
    }
    quadro.current = d.size ? requestAnimationFrame(passo) : null
  }
  const segurar = (d: Direcao) => {
    dirs.current.add(d)
    setSegurando(new Set(dirs.current))
    if (quadro.current === null) {
      ultimo.current = performance.now()
      quadro.current = requestAnimationFrame(passo)
    }
  }
  const soltar = (d: Direcao) => {
    dirs.current.delete(d)
    setSegurando(new Set(dirs.current))
  }
  useEffect(
    () => () => {
      if (quadro.current !== null) cancelAnimationFrame(quadro.current)
    },
    [],
  )
  return {
    pos,
    rumo,
    andando: segurando.size > 0,
    segurando,
    segurar,
    soltar,
    voltar: () => {
      setPos(inicio)
      setRumo(Math.PI / 2)
    },
  }
}

/**
 * A ilha do jogo em 3D, com a câmera de frente das aulas 1 e 2. O balão da porta fica preso ao
 * alto do farol (a posição na tela é a do farol projetado pela câmera).
 */
export function IlhaDoJogo({
  heroi,
  rumo,
  chaveNoChao,
  aceso,
  aviso,
  balao,
  onPronto,
}: {
  heroi: Ponto
  rumo: number
  chaveNoChao: boolean
  aceso: boolean
  aviso: string
  balao: BalaoDaIlha | null
  /** Avisa quando a cena fica pronta (antes disso a tela não deixa andar às cegas). */
  onPronto?: (pronto: boolean) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const atual = useRef({ heroi, rumo, chaveNoChao, aceso })
  const update = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [ancora, setAncora] = useState<{ x: number; y: number } | null>(null)
  // Cada "Tentar de novo" monta a cena outra vez.
  const [tentativa, setTentativa] = useState(0)
  const avisarPronto = useRef(onPronto)
  avisarPronto.current = onPronto
  useEffect(() => {
    avisarPronto.current?.(status === 'ready')
  }, [status])
  useEffect(() => {
    atual.current = { heroi, rumo, chaveNoChao, aceso }
    update.current?.()
  }, [heroi, rumo, chaveNoChao, aceso])
  useEffect(() => {
    let disposed = false
    let cleanup = () => {}
    async function mount() {
      // A cena do jogo, lida antes do renderizador (sair no meio não deixa nada para soltar).
      const { T, gltf } = await carregarIlhaDoJogo()
      if (disposed || !host.current) return
      const world = new T.Scene()
      const camera = new T.PerspectiveCamera(48, 1, 0.1, 200)
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: false })
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
      renderer.setClearColor('#94d5f5')
      renderer.domElement.setAttribute('role', 'img')
      const descrever = (chaveNoChao: boolean, aceso: boolean) =>
        renderer.domElement.setAttribute(
          'aria-label',
          `A ilha do jogo em 3D: o personagem, ${
            chaveNoChao ? 'a chave perto das pedras' : 'sem a chave no chão'
          } e o farol ${aceso ? 'aceso' : 'apagado'} na ilhota.`,
        )
      host.current.appendChild(renderer.domElement)
      world.add(new T.AmbientLight('#ffffff', 2.1))
      const sun = new T.DirectionalLight('#ffffff', 1.7)
      sun.position.set(3, 5, 4)
      world.add(sun)
      const recursos = new Set<{ dispose: () => void }>()
      let observer: ResizeObserver | undefined
      let anim: number | null = null
      cleanup = () => {
        // Uma vez só: no erro, o `catch` limpa e a desmontagem chamaria de novo.
        cleanup = () => {}
        observer?.disconnect()
        if (anim !== null) cancelAnimationFrame(anim)
        update.current = null
        world.traverse((o) => {
          const m = o as THREE.Mesh
          if (m.geometry) recursos.add(m.geometry)
          for (const mat of m.material
            ? Array.isArray(m.material)
              ? m.material
              : [m.material]
            : []) {
            recursos.add(mat)
            // As texturas do GLB também (como no `IslandWorld`).
            for (const valor of Object.values(mat))
              if (valor instanceof T.Texture) recursos.add(valor)
          }
        })
        for (const r of recursos) r.dispose()
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      }
      const scene = gltf.scene
      world.add(scene)
      const named = (name: string) => {
        const o = scene.children.find((o) => o.name === name)
        if (!o) throw Error(`Modelo ausente: ${name}`)
        return o
      }
      const key = named('Chave')
      const hero = named('Aventureiro')
      const farol = named('Farol')
      const barco = named('Veleiro')
      named('Bancada').visible = false
      // A luz do farol aceso: um brilho no alto da torre (o jogo toca a animação "acender").
      const caixa = new T.Box3().setFromObject(farol)
      const topo = caixa.max.y
      const lampadaY = topo - (topo - caixa.min.y) * 0.16
      const brilho = new T.Mesh(
        new T.SphereGeometry(0.45, 24, 16),
        new T.MeshBasicMaterial({ color: '#ffe36b', transparent: true, opacity: 0.85 }),
      )
      brilho.position.set(FAROL.x, lampadaY, FAROL.z)
      const luz = new T.PointLight('#ffd447', 0, 9)
      luz.position.copy(brilho.position)
      world.add(brilho, luz)
      const alto = new T.Vector3(FAROL.x, topo + 0.2, FAROL.z)
      let barcoX = BARCO.x
      let antes = performance.now()
      const render = () => {
        if (disposed) return
        const s = atual.current
        descrever(s.chaveNoChao, s.aceso)
        key.visible = s.chaveNoChao
        key.position.set(CHAVE.x, CHAVE_Y, CHAVE.z)
        hero.position.set(s.heroi.x, 0.8, s.heroi.z)
        hero.rotation.y = s.rumo
        brilho.visible = s.aceso
        luz.intensity = s.aceso ? 30 : 0
        barco.position.set(barcoX, BARCO.y, BARCO.z)
        // A câmera acompanha o personagem de leve (como no jogo, que anda com ele), sempre com o
        // farol à vista quando ele chega perto: o centro fica entre o personagem e o farol.
        const cx = Math.max(-4, Math.min(1.5, (s.heroi.x + FAROL.x) / 2))
        const ce = Math.cos(VISTA.el) * VISTA.dist
        camera.position.set(
          cx + ce * Math.sin(VISTA.az),
          Math.sin(VISTA.el) * VISTA.dist,
          0.3 + ce * Math.cos(VISTA.az),
        )
        camera.lookAt(cx, 0, 0.3)
        camera.fov = 48
        camera.zoom = Math.min(1, camera.aspect / 1.25)
        camera.updateProjectionMatrix()
        renderer.render(world, camera)
        const v = alto.clone().project(camera)
        const nova = {
          x: Math.min(86, Math.max(14, ((v.x + 1) / 2) * 100)),
          y: Math.max(8, ((1 - v.y) / 2) * 100),
        }
        setAncora((a) =>
          a && Math.abs(a.x - nova.x) < 0.3 && Math.abs(a.y - nova.y) < 0.3 ? a : nova,
        )
      }
      // O barco vem ao cais quando o farol acende (o `moveTowards` do jogo) e volta na partida nova.
      const barcoAnda = (agora: number) => {
        const dt = Math.min(0.05, (agora - antes) / 1000)
        antes = agora
        const alvo = atual.current.aceso ? BARCO_NO_CAIS : BARCO.x
        const passo = 1.8 * dt
        barcoX = Math.abs(alvo - barcoX) <= passo ? alvo : barcoX + Math.sign(alvo - barcoX) * passo
        render()
        anim = barcoX === alvo ? null : requestAnimationFrame(barcoAnda)
      }
      update.current = () => {
        render()
        const alvo = atual.current.aceso ? BARCO_NO_CAIS : BARCO.x
        if (barcoX !== alvo && anim === null) {
          antes = performance.now()
          anim = requestAnimationFrame(barcoAnda)
        }
      }
      observer = new ResizeObserver(() => {
        if (!host.current || disposed) return
        const { width, height } = host.current.getBoundingClientRect()
        renderer.setSize(width, height)
        camera.aspect = width / Math.max(1, height)
        render()
      })
      observer.observe(host.current)
      update.current()
      setStatus('ready')
    }
    mount().catch((erro) => {
      if (!disposed) {
        console.error('[ilha-do-farol] a cena 3D não abriu', erro)
        cleanup()
        setStatus('error')
      }
    })
    return () => {
      disposed = true
      cleanup()
    }
  }, [tentativa])
  return (
    <div
      className="sz-island-world sz-discovery-livre-ilha-jogo"
      data-ready={status === 'ready'}
      data-heroi={`${heroi.x.toFixed(2)},${heroi.z.toFixed(2)}`}
      data-vista-az={VISTA.az}
    >
      <div ref={host} className="sz-island-canvas" />
      <span className="sz-discovery-livre-ilha-aviso" role="status">
        {aviso}
      </span>
      {/* A resposta da porta para o leitor de tela (o balão é desenho preso ao farol). */}
      <span className="sr-only" aria-live="polite">
        {balao && status === 'ready' ? balao.texto : ''}
      </span>
      {balao && ancora && status === 'ready' ? (
        <span
          key={balao.texto}
          className="sz-discovery-livre-balao3d"
          data-tom={balao.tom}
          style={{ left: `${ancora.x}%`, top: `${ancora.y}%` }}
        >
          {balao.texto}
        </span>
      ) : null}
      {status === 'loading' && <p role="status">Preparando a ilha…</p>}
      {status === 'error' && (
        <div role="alert" className="sz-discovery-livre-ilha-erro">
          <p>Não foi possível abrir a ilha.</p>
          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              setTentativa((t) => t + 1)
            }}
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  )
}
