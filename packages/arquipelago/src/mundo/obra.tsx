import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { Obra as DadosDaObra } from '@sistemazero/arquipelago-contracts'
import { memo, useMemo, useRef, useState } from 'react'
import type { Object3D } from 'three'
import paredesGlb from '../assets/casa/casa-paredes.glb'
import pisosGlb from '../assets/casa/casa-pisos.glb'
import portasGlb from '../assets/casa/casa-portas.glb'
import telhadoGlb from '../assets/casa/casa-telhado.glb'
import { lojaDaConstrucao, useConstrucao } from '../estado/construcao'
import { useJogo } from '../estado/contexto'
import { type Planta, planta } from '../sistemas/construcao/comodos'
import { chaveDaCelula, type Lote } from '../sistemas/construcao/lote'
import {
  type ArquivoDoKit,
  type Corte,
  colisoresDaObra,
  type FolhaDaPorta,
  NADA_CORTADO,
  type PecaDoKit,
  pecasDaObra,
  TUDO_CORTADO,
} from '../sistemas/construcao/pecas'
import { paredesCortadasNoViver, telhadosDaObra } from '../sistemas/construcao/telhado'
import { giroEmY, type Solido } from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import { ComReserva, copiarNo, materiaisDe, useModelo } from './modelos'

/** O kit da casa (`arte/casa`): paredes, portas, pisos e telhado, um nó por peça. */
export const KIT_DA_CASA: Readonly<Record<ArquivoDoKit, string>> = {
  paredes: new URL(paredesGlb, import.meta.url).href,
  portas: new URL(portasGlb, import.meta.url).href,
  pisos: new URL(pisosGlb, import.meta.url).href,
  telhado: new URL(telhadoGlb, import.meta.url).href,
}

export function carregarKitDaCasa() {
  for (const url of Object.values(KIT_DA_CASA)) useGLTF.preload(url, false, false)
}

/** Quanto a folha gira para abrir (o clipe `abrir` do kit vai até -100°). */
export const GIRO_DA_FOLHA_ABERTA = -1.75
/** A folha abre quando a pessoa chega a esta distância do meio do vão (e fecha quando se afasta). */
export const PERTO_DA_PORTA = 2.2

/** Uma peça do kit: a cópia do nó, com os materiais do arquivo (as janelas acendem juntas). */
const Peca = memo(function Peca({ peca }: { peca: PecaDoKit }) {
  const raiz = useModelo(KIT_DA_CASA[peca.arquivo])
  const no = useMemo(() => copiarNo(raiz, peca.no), [raiz, peca.no])
  return <primitive object={no} position={[peca.x, peca.y ?? 0, peca.z]} rotation-y={peca.giro} />
})

/** A folha da porta: abre sozinha quando a pessoa chega perto, para o lado de fora. */
const Folha = memo(function Folha({
  folha,
  base,
}: {
  folha: FolhaDaPorta
  base: [number, number]
}) {
  const { rastro } = useJogo()
  const raiz = useModelo(KIT_DA_CASA.portas)
  const no = useMemo(() => copiarNo(raiz, folha.no), [raiz, folha.no])
  useFrame((_, dt) => {
    const perto =
      Math.hypot(rastro.x - (base[0] + folha.meio.x), rastro.z - (base[1] + folha.meio.z)) <
      PERTO_DA_PORTA
    const alvo = perto ? GIRO_DA_FOLHA_ABERTA : 0
    no.rotation.y += (alvo - no.rotation.y) * (1 - Math.exp(-dt * 6))
  })
  return (
    <group position={[folha.x, 0, folha.z]} rotation-y={folha.giro}>
      <primitive object={no} />
    </group>
  )
})

/** As janelas do kit acendem à noite, como as da casa (`vidroJanela`). */
function LuzDasJanelas() {
  const { ambiente } = useJogo()
  const paredes = useModelo(KIT_DA_CASA.paredes)
  const portas = useModelo(KIT_DA_CASA.portas)
  const vidros = useMemo(
    () => [...materiaisDe(paredes, 'vidroJanela'), ...materiaisDe(portas, 'vidroJanela')],
    [paredes, portas],
  )
  useFrame(() => {
    for (const m of vidros) m.emissiveIntensity = ambiente.noite ? 1.6 : 0
  })
  return null
}

function colisoresNoMundo(obra: DadosDaObra, p: Planta, cortada: Corte, y: number): Solido[] {
  return colisoresDaObra(obra, p, cortada).map((c) => ({
    forma: 'caixa',
    nome: c.nome,
    posicao: [c.posicao[0], c.posicao[1] + y, c.posicao[2]],
    meio: c.meio,
    rotacao: giroEmY(0),
  }))
}

/** De quanto em quanto tempo (s) o corte do Viver é conferido. */
const CONFERIR_O_CORTE = 0.12

/**
 * O corte das paredes: no Construir, todas; no Viver, com a pessoa dentro de casa, as que ficam
 * entre a câmera e ela (`paredesCortadasNoViver`). Também diz à loja se ela está dentro da obra
 * (o telhado sai).
 */
function useCorte(p: Planta, base: [number, number, number], construindo: boolean): Corte {
  const { loja, rastro } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const camera = useThree((s) => s.camera)
  const [cortadas, setCortadas] = useState<{ chave: string; set: Set<string> }>({
    chave: '',
    set: new Set(),
  })
  const espera = useRef(0)
  useFrame((_, dt) => {
    espera.current -= dt
    if (espera.current > 0) return
    espera.current = CONFERIR_O_CORTE
    const pessoa = { x: rastro.x - base[0], z: rastro.z - base[2] }
    construcao
      .getState()
      .definirDentroDaObra(
        p.dentro.has(chaveDaCelula({ x: Math.floor(pessoa.x), z: Math.floor(pessoa.z) })),
      )
    if (construindo) return
    const set = paredesCortadasNoViver(p, pessoa, {
      x: camera.position.x - base[0],
      z: camera.position.z - base[2],
    })
    const chave = [...set].sort().join(';')
    if (chave !== cortadas.chave) setCortadas({ chave, set })
  })
  return useMemo<Corte>(() => {
    if (construindo) return TUDO_CORTADO
    if (cortadas.set.size === 0) return NADA_CORTADO
    return (k) => cortadas.set.has(k)
  }, [construindo, cortadas])
}

/**
 * Uma obra no mundo: as paredes, quinas, portas, janelas, pisos e telhados do kit, e a colisão.
 * `base` é onde fica o ponto (0, 0) da grade (y: o topo do piso). O telhado sai no Construir e com
 * a pessoa dentro da obra.
 */
export function ObraNoMundo({
  obra,
  lote,
  base,
  construindo,
}: {
  obra: DadosDaObra
  lote: Lote
  base: [number, number, number]
  construindo: boolean
}) {
  const { loja } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const p = useMemo(() => planta(obra, lote), [obra, lote])
  const cortada = useCorte(p, base, construindo)
  const dentro = useConstrucao(construcao, (x) => x.dentroDaObra)
  const pecas = useMemo(() => pecasDaObra(obra, p, cortada), [obra, p, cortada])
  const telhados = useMemo(() => telhadosDaObra(p), [p])
  const colisores = useMemo(
    () => colisoresNoMundo(obra, p, cortada, base[1]),
    [obra, p, cortada, base],
  )
  const comTelhado = !construindo && !dentro
  const todas: PecaDoKit[] = [
    ...pecas.paredes,
    ...pecas.quinas,
    ...pecas.pisos,
    ...(comTelhado ? telhados : []),
  ]
  return (
    <>
      <group position={base}>
        <ComReserva reserva={<ObraDeAntes pecas={todas} />}>
          {todas.map((x) => (
            <Peca key={x.chave} peca={x} />
          ))}
          {pecas.folhas.map((f) => (
            <Folha key={f.chave} folha={f} base={[base[0], base[2]]} />
          ))}
          <LuzDasJanelas />
        </ComReserva>
      </group>
      <group position={[base[0], 0, base[2]]}>
        <Colisores lista={colisores} />
      </group>
    </>
  )
}

/** Enquanto o kit baixa (ou se o arquivo falhar), a obra aparece em caixas simples. */
function ObraDeAntes({ pecas }: { pecas: PecaDoKit[] }) {
  return (
    <>
      {pecas.map((x) => (
        <FormaDeAntes key={x.chave} peca={x} />
      ))}
    </>
  )
}

function FormaDeAntes({ peca }: { peca: PecaDoKit }) {
  const ref = useRef<Object3D>(null)
  if (peca.arquivo === 'pisos')
    return (
      <mesh position={[peca.x, -0.05, peca.z]}>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial color="#c9a87a" />
      </mesh>
    )
  if (peca.no.startsWith('quina')) {
    const alta = !peca.no.endsWith('-baixa')
    return (
      <mesh ref={ref} position={[peca.x, alta ? 2 : 0.5, peca.z]}>
        <boxGeometry args={[0.36, alta ? 4 : 1, 0.36]} />
        <meshStandardMaterial color="#f4ecdf" />
      </mesh>
    )
  }
  const largura =
    peca.no.includes('porta') || peca.no.includes('grande') ? 3 : peca.no.includes('arco') ? 2 : 1
  const alta = !peca.no.endsWith('-baixa')
  return (
    <group position={[peca.x, 0, peca.z]} rotation-y={peca.giro}>
      <mesh position={[0, alta ? 2 : 0.5, 0]}>
        <boxGeometry args={[largura, alta ? 4 : 1, 0.2]} />
        <meshStandardMaterial color={peca.no.includes('lambri') ? '#fbe7d2' : '#f1ece2'} />
      </mesh>
    </group>
  )
}
