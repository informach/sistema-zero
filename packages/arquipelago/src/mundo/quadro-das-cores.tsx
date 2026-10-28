import { useFrame } from '@react-three/fiber'
import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import { type Color, type MeshStandardMaterial, Object3D } from 'three'
import quadroGlb from '../assets/itens/quadro-das-cores.glb'
import { useJogo } from '../estado/contexto'
import { lojaDosDesafios, useDesafios } from '../estado/desafios'
import { manchasAcesas, quadrosDaIlha } from '../sistemas/quadro-das-cores'
import type { IlhaPreparada } from './ilha-completa'
import { useInterativo } from './interativos'
import { CINZA, copiarNo, materiaisDe, useModelo } from './modelos'

const QUADRO_URL = new URL(quadroGlb, import.meta.url).href

/**
 * Onde o quadro fica: perto da chegada da ponte (a primeira coisa que a pessoa vê ao entrar na
 * ilha), um pouco para dentro e para o lado do caminho. Medidas no chão do modelo da ilha.
 */
export const LUGAR_DO_QUADRO = { paraDentro: 3.2, paraOLado: 2.4 } as const
/** De que distância o botão "Ver o Quadro das Cores" aparece. */
export const ALCANCE_DO_QUADRO = 2.6
/** Quanto tempo a mancha leva para sair do cinza na festa da cor. */
export const DURACAO_DA_COR_S = 1.6

/** O nome do painel na loja (um por ilha). */
export const painelDoQuadro = (ilha: Ilha) => `quadro:${ilha.id}`

/** Onde o quadro fica, no espaço do grupo da ilha (o giro da ilha já aplicado). */
export function posicaoDoQuadro(modelo: Object3D): {
  x: number
  y: number
  z: number
  giro: number
} {
  const chegada = modelo.getObjectByName('chegada')
  const local = chegada ? chegada.position : { x: 11.6, y: 1, z: 0 }
  // No chão do modelo a chegada fica no +x: o quadro vem para dentro (−x) e para o lado (+z).
  const lx = local.x - LUGAR_DO_QUADRO.paraDentro
  const lz = local.z + LUGAR_DO_QUADRO.paraOLado
  const g = modelo.rotation.y
  const cos = Math.cos(g)
  const sin = Math.sin(g)
  const x = lx * cos + lz * sin
  const z = -lx * sin + lz * cos
  // De frente para a chegada (a frente do cavalete é o +z do arquivo).
  const cx = local.x * cos + local.z * sin
  const cz = -local.x * sin + local.z * cos
  return { x, y: local.y, z, giro: Math.atan2(cx - x, cz - z) }
}

export function QuadroDasCores({
  ilha,
  centro,
  preparada,
}: {
  ilha: Ilha
  centro: { x: number; z: number }
  preparada: IlhaPreparada
}) {
  const { loja, plataforma } = useJogo()
  const desafios = lojaDosDesafios(loja, plataforma)
  const dados = useDesafios(desafios, (s) => s.dados)
  const festa = useDesafios(desafios, (s) => s.festa)
  const raiz = useModelo(QUADRO_URL)
  const lugar = useMemo(() => posicaoDoQuadro(preparada.modelo), [preparada])

  const { modelo, manchas } = useMemo(() => {
    const grupo = new Object3D()
    grupo.add(copiarNo(raiz, 'quadro'))
    const manchas: { material: MeshStandardMaterial; cor: Color }[] = []
    for (let i = 1; i <= 6; i++) {
      const no = copiarNo(raiz, `cor-${i}`, true)
      grupo.add(no)
      const material = materiaisDe(no)[0]
      if (material) manchas.push({ material, cor: material.color.clone() })
    }
    return { modelo: grupo, manchas }
  }, [raiz])

  // A cor de cada mancha: 0 (cinza) a 1 (a cor da tinta). Feito acende; a festa anima.
  const quadros = useMemo(
    () => (dados ? quadrosDaIlha(dados.desafios, ilha.id) : []),
    [dados, ilha.id],
  )
  const alvo = useMemo(() => {
    const acesas = quadros.length > 0 ? manchasAcesas(quadros) : []
    return Array.from({ length: 6 }, (_, i) => (acesas[i] ? 1 : 0))
  }, [quadros])
  const atual = useRef<number[]>([0, 0, 0, 0, 0, 0])
  const pintados = useRef(false)

  useEffect(() => {
    // Primeira leitura (ou volta à ilha): as feitas já aparecem pintadas, sem animação.
    if (!pintados.current && dados) {
      atual.current = [...alvo]
      pintados.current = true
    }
  }, [alvo, dados])

  useFrame((_, dt) => {
    for (let i = 0; i < 6; i++) {
      const a = atual.current[i] ?? 0
      const b = alvo[i] ?? 0
      const emFesta = festa?.ilha === ilha.id && festa.quadros.includes(i + 1)
      const passo = emFesta ? dt / DURACAO_DA_COR_S : 1
      const novo = a < b ? Math.min(b, a + passo) : b
      atual.current[i] = novo
      const m = manchas[i]
      if (m) m.material.color.copy(CINZA).lerp(m.cor, novo)
    }
  })

  // Ao chegar na ilha: lê a lista para pintar o quadro.
  useEffect(() => {
    void desafios.getState().carregar()
  }, [desafios])

  useInterativo(`quadro-${ilha.id}`, {
    x: centro.x + lugar.x,
    z: centro.z + lugar.z,
    raio: ALCANCE_DO_QUADRO,
    rotulo: () => 'Ver o Quadro das Cores',
    agir: () => {
      loja.getState().abrirPainel(painelDoQuadro(ilha))
      void desafios.getState().carregar()
    },
  })

  return (
    <primitive
      object={modelo}
      position={[lugar.x, lugar.y, lugar.z]}
      rotation={[0, lugar.giro, 0]}
    />
  )
}
