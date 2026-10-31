import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import filhoteGlb from '../assets/bichos/triceratops-filhote.glb'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDoFilhote, PAINEL_DO_FILHOTE } from '../estado/filhote'
import { quemAcompanha } from '../sistemas/companhia'
import { CORPO } from '../sistemas/corpo'
import { FILHOTE_NO_VALE as F, tamanhoDoFilhote } from '../sistemas/filhote-do-vale'
import { jogoPausado } from '../sistemas/pausa'
import { atrasDela, criarSeguir, passoDoSeguir } from '../sistemas/seguir'
import { suavizarAngulo } from '../sistemas/zappy'
import { olhosNoInstante, PISCAR, trocarClipe, useCopiaAnimada } from './animado'
import { useInterativo } from './interativos'
import { ComReserva } from './modelos'

/**
 * O dino de estimação (§6.28, A7): com a companhia no filhote, ele sai do Vale e segue a criança
 * pela ilha e para casa, com o mesmo seguir do bichinho do quarto (`sistemas/seguir.ts`). Perto
 * dele, o mesmo painel de cuidar do Vale. Sem corpo de física, como o bicho adotado.
 */
export function FilhoteQueAcompanha() {
  const vai = useEstado((s) => quemAcompanha(s.salvamento, s.quarto.pet) === 'filhote')
  if (!vai) return null
  return (
    <ComReserva reserva={null}>
      <Filhote />
    </ComReserva>
  )
}

function Filhote() {
  const { loja, rastro, movimento } = useJogo()
  const painel = lojaDoFilhote(loja)
  const raiz = useRef<Group>(null)
  const visual = useRef<Group>(null)
  const { cena, actions, olhos } = useCopiaAnimada(
    new URL(filhoteGlb, import.meta.url).href,
    raiz,
    [],
  )
  const seguir = useRef(criarSeguir())
  const comecou = useRef(false)
  const pos = useRef({ x: rastro.x, y: rastro.y - CORPO.doCentroAoPe, z: rastro.z })
  const olhar = useRef(rastro.direcao)
  const tocando = useRef<string | null>(null)
  const piscarEm = useRef<number>(PISCAR.aCada)
  const relogio = useRef(0)

  useInterativo('filhote-que-acompanha', {
    get x() {
      return pos.current.x
    },
    get z() {
      return pos.current.z
    },
    raio: F.alcance,
    deFundo: true,
    rotulo: () => {
      const nome = loja.getState().salvamento.vale.filhote?.nome
      return nome ? `Cuidar de ${nome}` : null
    },
    agir: () => {
      const s = loja.getState()
      if (jogoPausado(s) || s.acesso.somenteLeitura || s.visita) return
      painel.getState().abrir()
      s.abrirPainel(PAINEL_DO_FILHOTE)
    },
  })

  useFrame((_, dtBruto) => {
    const g = visual.current
    if (!g) return
    const dt = Math.min(dtBruto, 0.1)
    const s = loja.getState()
    const pe = rastro.y - CORPO.doCentroAoPe
    if (!comecou.current) {
      comecou.current = true
      const p = atrasDela(rastro)
      pos.current = { x: p.x, y: pe, z: p.z }
    }
    const pausado = jogoPausado(s)
    const espera = pausado || movimento.modo !== 'chao' || s.nadando
    const passo = passoDoSeguir(seguir.current, { ...pos.current }, rastro, espera, dt)
    if (!pausado) {
      relogio.current += dt
      if (passo.reaparecer) {
        const p = atrasDela(rastro)
        pos.current = { x: p.x, y: pe, z: p.z }
      } else {
        pos.current.x += seguir.current.vx * dt
        pos.current.z += seguir.current.vz * dt
        if (movimento.noChao) pos.current.y += (pe - pos.current.y) * (1 - Math.exp(-8 * dt))
      }
      const rapidez = Math.hypot(seguir.current.vx, seguir.current.vz)
      if (rapidez > 0.2) olhar.current = Math.atan2(seguir.current.vx, seguir.current.vz)
      g.rotation.y = suavizarAngulo(g.rotation.y, olhar.current, 8, dt)
      const clipe = rapidez > 0.2 ? 'andar' : 'parado'
      if (clipe !== tocando.current) {
        trocarClipe(actions, tocando.current, clipe, 0.25, 'filhote-que-acompanha')
        tocando.current = clipe
      }
    }
    const f = s.salvamento.vale.filhote
    g.scale.setScalar(f ? tamanhoDoFilhote(f) : 1)
    g.position.set(pos.current.x, pos.current.y, pos.current.z)
    olhosNoInstante(olhos, relogio.current, piscarEm, false)
  })

  return (
    <group ref={visual} name="filhote-que-acompanha">
      <group ref={raiz}>
        <primitive object={cena} />
      </group>
    </group>
  )
}
