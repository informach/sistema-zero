import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import constelacoesUrl from '../assets/ilhas/nuvens-constelacoes.glb'
import { lojaDoConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import type { Ponto } from '../sistemas/cipo'
import {
  type Busca,
  direcaoDaMira,
  ESTRELAS,
  estrelasAcesas,
  FALA_DA_LUNETA,
  FALA_DE_DIA,
  FALA_DE_TODAS,
  FIGURAS,
  figuraNaMira,
  type Mira,
  PAINEL_DAS_ESTRELAS,
  passoDaBusca,
  passoDaMira,
  quantasAchadas,
} from '../sistemas/constelacoes'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import { iluminarArte, prepararLuzesNoturnas } from './arte-animada'
import { paraOMundo } from './bosque'
import { liberarObjeto } from './carregar-ilha'
import { type ColisorDaIlha, lerColisores, tirarNosDeColisao } from './colisores-da-ilha'
import { ColisoresSoltos } from './ilha-completa'
import { useInterativo } from './interativos'
import { materiaisDe } from './modelos'
import { MIRANTE_DAS_NUVENS, MIRANTE_NO_ARQUIVO } from './nuvens'
import { criarVistaDaLuneta } from './vista-da-luneta'

/** De onde se olha a luneta (a âncora `luneta` fica no deque, atrás da ocular). */
const ALCANCE_DA_LUNETA = 1.3
/** O olho da vista fica à frente do tubo, para o céu não ficar atrás dele. */
const OLHO_A_FRENTE_DO_TUBO = 1.6
/** O brilho das estrelas e das linhas de uma figura acesa. */
const BRILHO = { estrela: 1.4, linha: 0.6 } as const
/** Pela luneta, as figuras ainda não achadas aparecem bem fracas (sem as linhas). */
const FRACA = { opacidade: 0.3, brilho: 0.3 } as const

interface Figura {
  linhas: Mesh
  estrelas: Mesh[]
  /** O material de fábrica de cada estrela (a fraca troca por `estrelaFraca` e volta). */
  originais: (Material | Material[])[]
  /** O meio da figura no mundo: o centro das estrelas dela (o pivô do nó fica fora do desenho). */
  meio: Ponto
}

/** O centro das estrelas de uma figura, no mundo (para onde a mira aponta). */
export function meioDasEstrelas(estrelas: readonly Object3D[]): Ponto {
  const soma = new Vector3()
  const p = new Vector3()
  for (const e of estrelas) soma.add(e.getWorldPosition(p))
  soma.divideScalar(Math.max(1, estrelas.length))
  return { x: soma.x, y: soma.y, z: soma.z }
}

interface Mirante {
  cena: Object3D
  tubo: Object3D | null
  ancora: Ponto
  colisores: ColisorDaIlha[]
  figuras: Figura[]
  luzes: ReturnType<typeof prepararLuzesNoturnas>
  materiaisDasEstrelas: MeshStandardMaterial[]
  estrelaFraca: MeshStandardMaterial
  soltar: () => void
}

/** O `nuvens-constelacoes.glb`, sem cache global (sai com a ilha), já girado com a ilha. */
async function carregarMirante(giro: number): Promise<
  Omit<Mirante, 'figuras'> & {
    nosDasFiguras: Mesh[]
  }
> {
  const g = await new GLTFLoader().loadAsync(new URL(constelacoesUrl, import.meta.url).href)
  const cena = g.scene
  const soltar = () => liberarObjeto(cena)
  cena.rotation.y = giro
  const colisores = lerColisores(cena)
  tirarNosDeColisao(cena)
  const nosDasFiguras: Mesh[] = []
  for (let i = 1; i <= FIGURAS.length; i++) {
    const no = cena.getObjectByName(`constelacao-${i}`) as Mesh | undefined
    if (!no?.isMesh) {
      soltar()
      throw new Error(`nuvens-constelacoes sem o nó constelacao-${i}`)
    }
    nosDasFiguras.push(no)
  }
  const luneta = cena.getObjectByName('luneta')
  if (!luneta) {
    soltar()
    throw new Error('nuvens-constelacoes sem a âncora luneta')
  }
  const materiaisDasEstrelas = [
    ...materiaisDe(cena, 'estrela'),
    ...materiaisDe(cena, 'linhaConstelacao'),
  ]
  const estrela = materiaisDe(cena, 'estrela')[0]
  if (!estrela) {
    soltar()
    throw new Error('nuvens-constelacoes sem o material estrela')
  }
  const estrelaFraca = estrela.clone()
  estrelaFraca.transparent = true
  estrelaFraca.opacity = FRACA.opacidade
  estrelaFraca.depthWrite = false
  estrelaFraca.emissive.copy(estrela.color)
  estrelaFraca.emissiveIntensity = FRACA.brilho
  estrelaFraca.fog = false
  // O céu fica a 30 m ou mais: sem a neblina da cena, que apagaria as estrelas na vista.
  for (const m of materiaisDasEstrelas) {
    m.emissive.copy(m.color)
    m.fog = false
  }
  return {
    cena,
    tubo: cena.getObjectByName('luneta-tubo') ?? null,
    ancora: { x: luneta.position.x, y: luneta.position.y, z: luneta.position.z },
    colisores,
    nosDasFiguras,
    luzes: prepararLuzesNoturnas(materiaisDe(cena)),
    materiaisDasEstrelas,
    estrelaFraca,
    soltar: () => {
      estrelaFraca.dispose()
      soltar()
    },
  }
}

/**
 * As constelações escondidas das Nuvens (fase4-07, regras em `sistemas/constelacoes.ts`): o
 * mirante com a luneta, os colisores dele e as seis figuras no céu. À noite, "Olhar pela luneta"
 * abre a vista; segurar a mira numa figura a acende. De dia, o Zappy diz que as estrelas só
 * aparecem à noite. Montado pelo `NuvensVivo`, só com a ilha completa ativa.
 */
export function ConstelacoesDasNuvens({ meio, giro }: { meio: Ponto; giro: number }) {
  const [mirante, definir] = useState<Mirante | null>(null)
  // O arquivo já está no referencial das Nuvens; o mirante vai para a constante (a âncora pedida).
  const lugar = useMemo(
    () =>
      paraOMundo(
        {
          x: MIRANTE_DAS_NUVENS.x - MIRANTE_NO_ARQUIVO.x,
          y: 0,
          z: MIRANTE_DAS_NUVENS.z - MIRANTE_NO_ARQUIVO.z,
        },
        meio,
        giro,
        { x: 0, y: 0, z: 0 },
      ),
    [meio, giro],
  )
  useEffect(() => {
    let vivo = true
    let soltar: (() => void) | null = null
    carregarMirante(giro)
      .then((m) => {
        if (!vivo) {
          m.soltar()
          return
        }
        soltar = m.soltar
        m.cena.position.set(lugar.x, lugar.y, lugar.z)
        m.cena.updateMatrixWorld(true)
        const figuras = m.nosDasFiguras.map((linhas) => {
          const estrelas = linhas.children.filter(
            (c): c is Mesh => (c as Mesh).isMesh === true && c.name.includes('-estrela-'),
          )
          return {
            linhas,
            estrelas,
            originais: estrelas.map((e) => e.material),
            meio: meioDasEstrelas(estrelas),
          }
        })
        definir({ ...m, figuras })
      })
      // Sem o mirante, a ilha fica como era: nada a olhar até ela carregar de novo.
      .catch(() => {})
    return () => {
      vivo = false
      soltar?.()
    }
  }, [giro, lugar])
  if (!mirante) return null
  return <MiranteVivo mirante={mirante} lugar={lugar} giro={giro} />
}

function MiranteVivo({ mirante, lugar, giro }: { mirante: Mirante; lugar: Ponto; giro: number }) {
  const { loja, movimento, rastro, ambiente, controle } = useJogo()
  const aparelhoPedeMenos = useReducedMotion()
  const aberta = useEstado((s) => s.painelAberto === PAINEL_DAS_ESTRELAS)
  // A âncora da luneta e o pivô do tubo no mundo.
  const luneta = useMemo(
    () => paraOMundo(mirante.ancora, lugar, giro, { x: 0, y: 0, z: 0 }),
    [mirante, lugar, giro],
  )
  const pivo = useMemo(() => {
    const p = new Vector3()
    mirante.tubo?.getWorldPosition(p)
    return { x: p.x, y: p.y, z: p.z }
  }, [mirante])
  const meios = useMemo(() => mirante.figuras.map((f) => f.meio), [mirante])
  // O tubo começa mirando a arara (o arquivo diz): girar dali até a mira, no referencial do pai dele.
  const tubo = useMemo(() => {
    const no = mirante.tubo
    const pai = no?.parent
    const arara = mirante.figuras[0]?.meio
    if (!no || !pai || !arara) return null
    const paraOPai = pai.getWorldQuaternion(new Quaternion()).invert()
    const inicio = new Vector3(arara.x - pivo.x, arara.y - pivo.y, arara.z - pivo.z)
      .normalize()
      .applyQuaternion(paraOPai)
    return { no, paraOPai, inicio, original: no.quaternion.clone(), mira: new Vector3() }
  }, [mirante, pivo])
  const q = useRef({
    mira: { giro: 0, inclinacao: ESTRELAS.inclinacao.inicial } as Mira,
    busca: { figura: -1, segundos: 0 } as Busca,
    direcao: { x: 0, y: 0, z: 1 },
    olho: { x: 0, y: 0, z: 0 },
    giroDoTubo: new Quaternion(),
    /** Há quanto tempo cada figura acendeu (Infinity = antes desta montagem, já toda acesa). */
    acesas: FIGURAS.map(() => Number.POSITIVE_INFINITY),
  }).current
  useEffect(
    () => () => {
      if (tubo) tubo.no.quaternion.copy(tubo.original)
    },
    [tubo],
  )

  useInterativo('nuvens:luneta', {
    x: luneta.x,
    z: luneta.z,
    raio: ALCANCE_DA_LUNETA,
    rotulo: () =>
      movimento.modo === 'chao' &&
      Math.abs(rastro.y - CORPO.doCentroAoPe - CORPO.folga - luneta.y) < 0.5
        ? 'Olhar pela luneta'
        : null,
    agir: () => {
      const s = loja.getState()
      if (!ambiente.noite) {
        s.dizer(FALA_DE_DIA)
        return
      }
      // A mira começa para onde a criança olha, um pouco acima do horizonte.
      q.mira.giro = rastro.direcao
      q.mira.inclinacao = ESTRELAS.inclinacao.inicial
      q.busca.figura = -1
      q.busca.segundos = 0
      s.dizer(
        quantasAchadas(s.salvamento.nuvens.constelacoes) === FIGURAS.length
          ? FALA_DE_TODAS
          : FALA_DA_LUNETA,
      )
      s.abrirPainel(PAINEL_DAS_ESTRELAS)
    },
  })

  // Fechou a vista (Voltar, Esc) ou a ilha saiu: a câmera volta.
  useEffect(() => {
    if (!aberta) movimento.mira = null
  }, [aberta, movimento])
  useEffect(
    () => () => {
      movimento.mira = null
      if (loja.getState().painelAberto === PAINEL_DAS_ESTRELAS) loja.getState().abrirPainel(null)
    },
    [movimento, loja],
  )

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    const s = loja.getState()
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    iluminarArte(mirante.luzes, ambiente.noite)
    // A vista da luneta é um painel, mas as estrelas acendem nela: só as outras pausas congelam.
    const pausado = jogoPausado(
      s.painelAberto === PAINEL_DAS_ESTRELAS ? { ...s, painelAberto: null } : s,
    )
    if (!pausado) for (let i = 0; i < q.acesas.length; i++) q.acesas[i] = (q.acesas[i] ?? 0) + dt

    // A vista pela luneta: o direcional (e os botões do visor) mira o céu.
    const naVista = s.painelAberto === PAINEL_DAS_ESTRELAS
    if (naVista && !ambiente.noite) {
      // Amanheceu com a luneta aberta: as estrelas foram embora.
      s.abrirPainel(null)
      s.dizer(FALA_DE_DIA)
    } else if (naVista) {
      const pedido = movimento.mira
      const eixoX = Math.max(-1, Math.min(1, controle.eixoX + (pedido?.pedidoX ?? 0)))
      const eixoZ = Math.max(-1, Math.min(1, controle.eixoZ + (pedido?.pedidoZ ?? 0)))
      passoDaMira(q.mira, eixoX, eixoZ, dt)
      const d = direcaoDaMira(q.mira, q.direcao)
      const olho = q.olho
      olho.x = pivo.x + d.x * OLHO_A_FRENTE_DO_TUBO
      olho.y = pivo.y + d.y * OLHO_A_FRENTE_DO_TUBO
      olho.z = pivo.z + d.z * OLHO_A_FRENTE_DO_TUBO
      const vista = movimento.mira ?? criarVistaDaLuneta(ESTRELAS.campo)
      vista.posicao.x = olho.x
      vista.posicao.y = olho.y
      vista.posicao.z = olho.z
      vista.alvo.x = olho.x + d.x * 30
      vista.alvo.y = olho.y + d.y * 30
      vista.alvo.z = olho.z + d.z * 30
      movimento.mira = vista
      const naMira = figuraNaMira(olho, d, meios)
      vista.naMira = naMira
      const achou = passoDaBusca(q.busca, naMira, s.salvamento.nuvens.constelacoes, dt)
      if (achou >= 0) {
        s.acharConstelacao(achou)
        q.acesas[achou] = 0
        const figura = FIGURAS[achou]
        const todas =
          quantasAchadas(loja.getState().salvamento.nuvens.constelacoes) === FIGURAS.length
        if (figura) s.dizer(todas ? `${figura.fala} ${FALA_DE_TODAS}` : figura.fala)
      }
      // O tubo acompanha a mira (girando a partir de onde o arquivo deixa ele).
      if (tubo) {
        tubo.mira.set(d.x, d.y, d.z).applyQuaternion(tubo.paraOPai)
        q.giroDoTubo.setFromUnitVectors(tubo.inicio, tubo.mira)
        tubo.no.quaternion.copy(tubo.original).premultiply(q.giroDoTubo)
      }
    }

    // As figuras: de dia, nada; à noite, a achada acende uma estrela por vez e fica acesa; a ainda
    // escondida só aparece fraca pela luneta, sem as linhas.
    const achadas = s.salvamento.nuvens.constelacoes
    const pelaLuneta = s.painelAberto === PAINEL_DAS_ESTRELAS && ambiente.noite
    for (let i = 0; i < mirante.figuras.length; i++) {
      const f = mirante.figuras[i]
      if (!f) continue
      const achada = ambiente.noite && (achadas & (1 << i)) !== 0
      f.linhas.visible = achada || pelaLuneta
      if (!f.linhas.visible) continue
      const n = achada
        ? estrelasAcesas(q.acesas[i] ?? Number.POSITIVE_INFINITY, f.estrelas.length, menos)
        : f.estrelas.length
      for (let k = 0; k < f.estrelas.length; k++) {
        const e = f.estrelas[k]
        if (!e) continue
        e.visible = k < n
        const material = achada ? (f.originais[k] ?? e.material) : mirante.estrelaFraca
        if (e.material !== material) e.material = material
      }
      // As linhas entram junto com a última estrela (e não aparecem na figura ainda escondida).
      f.linhas.geometry.setDrawRange(
        0,
        achada && n >= f.estrelas.length ? Number.POSITIVE_INFINITY : 0,
      )
    }
    for (const m of mirante.materiaisDasEstrelas)
      m.emissiveIntensity = m.name === 'estrela' ? BRILHO.estrela : BRILHO.linha
  })

  return (
    <>
      <primitive object={mirante.cena} />
      <group position={[lugar.x, lugar.y, lugar.z]}>
        <ColisoresSoltos colisores={mirante.colisores} />
      </group>
    </>
  )
}
