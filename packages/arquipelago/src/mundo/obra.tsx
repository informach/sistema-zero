import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { Obra as DadosDaObra } from '@sistemazero/arquipelago-contracts'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { Material, Object3D } from 'three'
import paredesGlb from '../assets/casa/casa-paredes.glb'
import pisosGlb from '../assets/casa/casa-pisos.glb'
import portasGlb from '../assets/casa/casa-portas.glb'
import telhadoGlb from '../assets/casa/casa-telhado.glb'
import varandaGlb from '../assets/casa/casa-varanda.glb'
import { lojaDaConstrucao, useConstrucao } from '../estado/construcao'
import { useJogo } from '../estado/contexto'
import { type Planta, planta } from '../sistemas/construcao/comodos'
import { type Entrada, entradaDaObra } from '../sistemas/construcao/entrada'
import { arestaDaChave, chavesDosTrechos } from '../sistemas/construcao/grade'
import { chaveDaCelula, type Lote } from '../sistemas/construcao/lote'
import {
  type ArquivoDoKit,
  type Corte,
  colisoresDaObra,
  colisoresDaVaranda,
  type FolhaDaPorta,
  NADA_CORTADO,
  type PecaDoKit,
  pecasDaObra,
  pecasDaVaranda,
  TUDO_CORTADO,
} from '../sistemas/construcao/pecas'
import { CERCA, colisoresDaCerca, postesDaCerca } from '../sistemas/construcao/quintal'
import { paredesCortadasNoViver, telhadosDaObra } from '../sistemas/construcao/telhado'
import { giroEmY, type Solido } from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import { noModelo } from './medidas'
import { ComReserva, copiarNo, materiaisDe, useModelo } from './modelos'
import {
  type CoresDoMeuQuarto,
  MATERIAL_DE_DENTRO,
  materiaisDoMeuQuarto,
  pintarLado,
} from './quarto-na-obra'

/**
 * O kit da casa (`arte/casa`): paredes, portas, pisos, telhado e a varanda da porta de entrada, um nó
 * por peça.
 */
export const KIT_DA_CASA: Readonly<Record<ArquivoDoKit, string>> = {
  paredes: new URL(paredesGlb, import.meta.url).href,
  portas: new URL(portasGlb, import.meta.url).href,
  pisos: new URL(pisosGlb, import.meta.url).href,
  telhado: new URL(telhadoGlb, import.meta.url).href,
  varanda: new URL(varandaGlb, import.meta.url).href,
}

export function carregarKitDaCasa() {
  for (const url of Object.values(KIT_DA_CASA)) useGLTF.preload(url, false, false)
}

/** Quanto a folha gira para abrir (o clipe `abrir` do kit vai até -100°). */
export const GIRO_DA_FOLHA_ABERTA = -1.75
/** A folha abre quando a pessoa chega a esta distância do meio do vão (e fecha quando se afasta). */
export const PERTO_DA_PORTA = 2.2

/**
 * Uma peça do kit: a cópia do nó, com os materiais do arquivo (as janelas acendem juntas). Com
 * `dentro`, o lado que dá para o quarto usa esse material (a cor do Meu quarto, cópia desta
 * montagem).
 */
const Peca = memo(function Peca({ peca, dentro }: { peca: PecaDoKit; dentro?: Material }) {
  const raiz = useModelo(KIT_DA_CASA[peca.arquivo])
  const lado = peca.quarto?.material
  const no = useMemo(() => {
    const copia = copiarNo(raiz, peca.no)
    if (dentro && lado) pintarLado(copia, lado, dentro)
    return copia
  }, [raiz, peca.no, dentro, lado])
  return <primitive object={no} position={[peca.x, peca.y ?? 0, peca.z]} rotation-y={peca.giro} />
})

/**
 * As peças do kit; as das paredes do quarto com a cor do Meu quarto do lado de dentro (uma cópia do
 * material por montagem, descartada ao sair ou ao trocar a cor).
 */
function PecasDoKit({ pecas, cores }: { pecas: PecaDoKit[]; cores?: CoresDoMeuQuarto }) {
  const raiz = useModelo(KIT_DA_CASA.paredes)
  const esquerda = cores?.esquerda
  const fundo = cores?.fundo
  const materiais = useMemo(() => {
    const base = materiaisDe(raiz, MATERIAL_DE_DENTRO)[0]
    if (!base || esquerda === undefined || fundo === undefined) return null
    return materiaisDoMeuQuarto(base, { esquerda, fundo })
  }, [raiz, esquerda, fundo])
  useEffect(
    () => () => {
      materiais?.esquerda.dispose()
      materiais?.fundo.dispose()
    },
    [materiais],
  )
  return (
    <>
      {pecas.map((x) => (
        <Peca
          key={x.chave}
          peca={x}
          dentro={x.quarto && materiais ? materiais[x.quarto.cor] : undefined}
        />
      ))}
    </>
  )
}

/** A folha da porta: abre sozinha quando a pessoa chega perto, para o lado de fora. */
const Folha = memo(function Folha({
  folha,
  base,
  giro,
}: {
  folha: FolhaDaPorta
  base: [number, number]
  giro: number
}) {
  const { rastro } = useJogo()
  const raiz = useModelo(KIT_DA_CASA.portas)
  const no = useMemo(() => copiarNo(raiz, folha.no), [raiz, folha.no])
  useFrame((_, dt) => {
    const pessoa = noModelo(rastro.x - base[0], rastro.z - base[1], giro)
    const perto = Math.hypot(pessoa.x - folha.meio.x, pessoa.z - folha.meio.z) < PERTO_DA_PORTA
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

/** O lampião da varanda acende à noite, como o da casa de antes (`lampiao`). */
function LuzDoLampiao() {
  const { ambiente } = useJogo()
  const varanda = useModelo(KIT_DA_CASA.varanda)
  const lampioes = useMemo(() => materiaisDe(varanda, 'lampiao'), [varanda])
  useFrame(() => {
    for (const m of lampioes) m.emissiveIntensity = ambiente.noite ? 2.4 : 0.15
  })
  return null
}

function colisoresNoMundo(
  obra: DadosDaObra,
  p: Planta,
  cortada: Corte,
  y: number,
  entrada: Entrada | null,
): Solido[] {
  return [
    ...colisoresDaObra(obra, p, cortada),
    ...colisoresDaCerca(obra),
    ...colisoresDaVaranda(entrada),
  ].map((c) => ({
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
function useCorte(
  p: Planta,
  base: [number, number, number],
  giro: number,
  construindo: boolean,
): Corte {
  const { loja, rastro } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  useEffect(() => () => construcao.getState().definirDentroDaObra(false), [construcao])
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
    const pessoa = noModelo(rastro.x - base[0], rastro.z - base[2], giro)
    construcao
      .getState()
      .definirDentroDaObra(
        p.dentro.has(chaveDaCelula({ x: Math.floor(pessoa.x), z: Math.floor(pessoa.z) })),
      )
    if (construindo) return
    const set = paredesCortadasNoViver(
      p,
      pessoa,
      noModelo(camera.position.x - base[0], camera.position.z - base[2], giro),
    )
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
 * Uma obra no mundo: as paredes, quinas, portas, janelas, pisos e telhados do kit, a varanda da porta
 * de entrada (na casa: `entradaDaObra`, ela segue a entrada) e a colisão.
 * `base` é onde fica o ponto (0, 0) da grade (y: o topo do piso) e `giro` o giro da grade em volta
 * do y (a da casa é a do mundo; a de uma cabana gira com a ilha). O telhado sai no Construir e com
 * a pessoa dentro da obra.
 */
export function ObraNoMundo({
  obra,
  lote,
  base,
  giro = 0,
  construindo,
  coresDoMeuQuarto,
}: {
  obra: DadosDaObra
  lote: Lote
  base: [number, number, number]
  giro?: number
  construindo: boolean
  /** Na casa, a cor de dentro das paredes da esquerda e do fundo do quarto (a do Meu quarto). */
  coresDoMeuQuarto?: CoresDoMeuQuarto
}) {
  const { loja } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const p = useMemo(() => planta(obra, lote), [obra, lote])
  const cortada = useCorte(p, base, giro, construindo)
  const dentro = useConstrucao(construcao, (x) => x.dentroDaObra)
  const pecas = useMemo(() => pecasDaObra(obra, p, cortada), [obra, p, cortada])
  const telhados = useMemo(() => telhadosDaObra(p), [p])
  const entrada = useMemo(() => entradaDaObra(obra, lote, p), [obra, lote, p])
  const varanda = useMemo(() => pecasDaVaranda(entrada), [entrada])
  const colisores = useMemo(
    () => colisoresNoMundo(obra, p, cortada, base[1], entrada),
    [obra, p, cortada, base, entrada],
  )
  const comTelhado = !construindo && !dentro
  const caminhos = useMemo(() => caminhosDaObra(obra), [obra])
  const todas: PecaDoKit[] = [
    ...pecas.paredes,
    ...pecas.quinas,
    ...pecas.pisos,
    ...caminhos,
    ...varanda.varanda,
    // O toldo sai com o telhado (senão tapa a vista de dentro e do Construir).
    ...(comTelhado ? [...telhados, ...varanda.toldo] : []),
  ]
  return (
    <>
      <group position={base} rotation-y={giro}>
        <ComReserva reserva={<ObraDeAntes pecas={todas} />}>
          <PecasDoKit pecas={todas} cores={coresDoMeuQuarto} />
          {pecas.folhas.map((f) => (
            <Folha key={f.chave} folha={f} base={[base[0], base[2]]} giro={giro} />
          ))}
          <LuzDasJanelas />
          {entrada ? <LuzDoLampiao /> : null}
        </ComReserva>
        <Cerca obra={obra} />
      </group>
      <group position={[base[0], 0, base[2]]} rotation-y={giro}>
        <Colisores lista={colisores} />
      </group>
    </>
  )
}

/**
 * O caminho do quintal com o piso de pedra ou de grama do kit. O topo dele é o do chão da ilha
 * (README do kit); sobe 1 cm para não piscar contra o terreno.
 */
const ACIMA_DO_TERRENO = 0.01

function caminhosDaObra(obra: DadosDaObra): PecaDoKit[] {
  return obra.caminhos.map((c) => ({
    chave: `caminho@${c.x},${c.z},${c.tipo}`,
    arquivo: 'pisos',
    no: `piso-${c.tipo}`,
    x: c.x + 0.5,
    z: c.z + 0.5,
    giro: 0,
    y: ACIMA_DO_TERRENO,
  }))
}

const MADEIRA_DA_CERCA = '#b07a4a'

/** A cerca de madeira (formas do código: o kit ainda não tem a peça). */
function Cerca({ obra }: { obra: DadosDaObra }) {
  const postes = useMemo(() => postesDaCerca(obra), [obra])
  const travessas = useMemo(() => [...chavesDosTrechos(obra.cercas)].map(arestaDaChave), [obra])
  if (postes.length === 0) return null
  return (
    <group position={[0, -0.02, 0]}>
      {postes.map((p) => (
        <mesh key={`${p.x},${p.z}`} position={[p.x, CERCA.altura / 2, p.z]}>
          <boxGeometry args={[CERCA.poste, CERCA.altura, CERCA.poste]} />
          <meshStandardMaterial color={MADEIRA_DA_CERCA} />
        </mesh>
      ))}
      {travessas.flatMap((a) =>
        CERCA.travessas.map((y) => (
          <mesh
            key={`${a.eixo}${a.x},${a.z},${y}`}
            position={a.eixo === 'x' ? [a.x + 0.5, y, a.z] : [a.x, y, a.z + 0.5]}
          >
            <boxGeometry
              args={
                a.eixo === 'x'
                  ? [1, CERCA.alturaDaTravessa, CERCA.espessura]
                  : [CERCA.espessura, CERCA.alturaDaTravessa, 1]
              }
            />
            <meshStandardMaterial color={MADEIRA_DA_CERCA} />
          </mesh>
        )),
      )}
    </group>
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
  if (peca.arquivo === 'varanda') {
    // O deque (o toldo espera o arquivo).
    if (peca.no !== 'varanda') return null
    return (
      <group position={[peca.x, 0, peca.z]} rotation-y={peca.giro}>
        <mesh position={[0, 0, 0.975]}>
          <boxGeometry args={[4.2, 0.1, 1.55]} />
          <meshStandardMaterial color="#c08a5a" />
        </mesh>
      </group>
    )
  }
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
