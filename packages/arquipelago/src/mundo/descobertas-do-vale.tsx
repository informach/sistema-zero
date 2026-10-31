import { useFrame } from '@react-three/fiber'
import type { FossilDoVale, NinhoDoVale } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef, useState } from 'react'
import { Box3, type Group, Vector3 } from 'three'
import propsGlb from '../assets/ilhas/vale-dos-dinos-props.glb'
import { useEstado, useJogo } from '../estado/contexto'
import { comLanterna, temLanterna } from '../sistemas/borroes'
import { CORPO } from '../sistemas/corpo'
import {
  escavarFossil,
  fosseisAchados,
  fossilNaAreia,
  NOME_DO_FOSSIL,
  TEXTOS_DOS_FOSSEIS,
} from '../sistemas/fosseis'
import {
  caminhoDaOnda,
  comecarOndas,
  FALAS_DAS_ONDAS,
  fimDasOndas,
  luzProtegeONinho,
  ONDAS_DE_CINZA,
  type OndasDoNinho,
  passoDasOndas,
} from '../sistemas/ondas-de-cinza'
import { jogoPausado } from '../sistemas/pausa'
import {
  ACOES_DA_ESCAVACAO,
  cuidarDoNinho,
  escavarNoVale,
  FALA_DE_REVER_O_FOSSIL,
  FALAS_DA_ESCAVACAO,
  registrarPegadasDoVale,
  seguirPegadasDoVale,
  EXPLORACAO_DO_VALE as V,
} from '../sistemas/vale'
import { paraOMundo } from './bosque'
import { explorarVale } from './exploracao-do-vale'
import type { IlhaPreparada, Troca } from './ilha-completa'
import { useInterativo } from './interativos'
import { ComReserva, copiarNo, useModelo } from './modelos'
import { RastroDePegadas } from './rastro-de-pegadas'

export function DescobertasDoVale({
  preparada,
  meio,
  giro,
  troca,
}: {
  preparada: IlhaPreparada
  meio: { x: number; y: number; z: number }
  giro: number
  troca: Troca
}) {
  const { loja, rastro, movimento } = useJogo()
  const etapa = useEstado((s) => s.salvamento.vale.escavacao)
  // Depois do primeiro osso, um fóssil novo por dia espera na areia (B4).
  const naAreia = useEstado((s) => (s.visita ? null : fossilNaAreia(s.salvamento, new Date())))
  const locais = useMemo(() => explorarVale(preparada.modelo, preparada.colisores), [preparada])
  const lugares = useMemo(() => {
    const mundo = (p: { x: number; z: number; y?: number }) =>
      paraOMundo({ ...p, y: p.y ?? locais.chegada.y }, meio, giro, { x: 0, y: 0, z: 0 })
    return {
      escavacao: mundo(locais.escavacao),
      pontos: locais.pontos.map(mundo),
      pegadas: locais.pegadas.map((p) => ({ ...mundo(p), giro: p.giro + giro })),
      ninhos: locais.ninhos.map((n) => ({ ...mundo(n), id: n.id })),
      // As ondas de cinza descem do vulcão (§6.28 A8); sem o nó, de longe atrás da escavação.
      vulcao: (() => {
        const v = preparada.modelo.getObjectByName('vulcao')?.position
        return v
          ? mundo({ x: v.x, z: v.z })
          : mundo({ x: locais.escavacao.x, z: locais.escavacao.z - 12 })
      })(),
    }
  }, [locais, meio, giro, preparada])
  const seguido = useRef(0)
  // O ninho sendo protegido e as ondas dele (no aparelho; o salvamento só guarda o ninho cuidado).
  const [protegendo, setProtegendo] = useState<NinhoDoVale | null>(null)
  const ondas = useRef<OndasDoNinho>(comecarOndas())
  const podeAgir = () => {
    const s = loja.getState()
    return (
      troca.opacidade >= 0.99 &&
      !jogoPausado(s) &&
      !s.acesso.somenteLeitura &&
      !s.visita &&
      movimento.modo === 'chao' &&
      movimento.noChao &&
      Math.abs(rastro.y - (locais.chegada.y + meio.y + CORPO.doCentroAoPe + CORPO.folga)) <
        CORPO.degrau
    )
  }
  useInterativo('escavacao-do-vale', {
    ...lugares.escavacao,
    raio: V.alcance,
    rotulo: () => {
      const s = loja.getState().salvamento
      const acao = ACOES_DA_ESCAVACAO[s.vale.escavacao]
      if (acao) return acao
      return fossilNaAreia(s, new Date()) ? TEXTOS_DOS_FOSSEIS.escavar : 'Rever o fóssil'
    },
    agir: () => {
      if (!podeAgir()) return
      const antes = loja.getState().salvamento.vale.escavacao
      if (antes < 3) {
        loja.getState().mudar((s) => escavarNoVale(s, true))
        loja.getState().dizer(FALAS_DA_ESCAVACAO[antes] ?? FALA_DE_REVER_O_FOSSIL)
        return
      }
      const r = escavarFossil(loja.getState().salvamento, new Date(), true)
      if (r) {
        loja.getState().mudar((s) => escavarFossil(s, new Date(), true)?.salvamento ?? s)
        loja.getState().dizer(TEXTOS_DOS_FOSSEIS.achou(NOME_DO_FOSSIL[r.fossil]))
        return
      }
      const todos = fosseisAchados(loja.getState().salvamento).length === 6
      loja
        .getState()
        .dizer(
          todos
            ? TEXTOS_DOS_FOSSEIS.todos
            : `${FALA_DE_REVER_O_FOSSIL} ${TEXTOS_DOS_FOSSEIS.amanha}`,
        )
    },
  })
  useFrame(() => {
    if (!podeAgir()) return
    const s = loja.getState()
    if (!s.salvamento.vale.pegadas) {
      const proximo = seguirPegadasDoVale(seguido.current, lugares.pontos, rastro, true)
      if (proximo !== seguido.current) {
        seguido.current = proximo
        if (proximo === lugares.pontos.length) {
          s.mudar((atual) => registrarPegadasDoVale(atual, true))
          s.dizer('Você seguiu as pegadas até a escavação. O rastro ficou no seu diário.')
        } else if (proximo === 1) {
          s.dizer('Estas pegadas têm três dedos. Siga o rastro até a escavação.')
        }
      }
    }
  })
  // As ondas andam com o jogo (a pausa para tudo); a luz protege perto do ninho, de lanterna acesa.
  useFrame((_, dt) => {
    const ninho = lugares.ninhos.find((n) => n.id === protegendo)
    if (!ninho) return
    const s = loja.getState()
    if (jogoPausado(s)) return
    const luz = luzProtegeONinho(comLanterna(s.lanterna, s.salvamento.inventario), rastro, ninho)
    passoDasOndas(ondas.current, Math.min(dt, 0.1), luz)
    const fim = fimDasOndas(ondas.current)
    if (!fim || caminhoDaOnda(ondas.current, ONDAS_DE_CINZA.quantas - 1) < 1.3) return
    setProtegendo(null)
    if (fim === 'protegido' && podeAgir()) {
      s.mudar((atual) => cuidarDoNinho(atual, ninho.id, true))
      s.dizer(FALAS_DAS_ONDAS.protegido(loja.getState().salvamento.vale.ninhos.length))
    } else s.dizer(FALAS_DAS_ONDAS.deNovo)
  })
  return (
    <>
      <RastroDePegadas
        bicho="dino"
        pegadas={lugares.pegadas}
        y={lugares.escavacao.y}
        tamanho={V.tamanhoDaPegada}
      />
      {lugares.ninhos.map((ninho) => (
        <Ninho
          key={ninho.id}
          ninho={ninho}
          podeAgir={podeAgir}
          ocupado={() => protegendo !== null}
          proteger={() => {
            const s = loja.getState()
            if (!temLanterna(s.salvamento.inventario)) {
              s.dizer(FALAS_DAS_ONDAS.semLanterna)
              return
            }
            ondas.current = comecarOndas()
            setProtegendo(ninho.id)
            s.dizer(FALAS_DAS_ONDAS.comeco)
          }}
        />
      ))}
      {lugares.ninhos
        .filter((n) => n.id === protegendo)
        .map((ninho) => (
          <OndasDeCinza key={ninho.id} ondas={ondas} de={lugares.vulcao} ate={ninho} />
        ))}
      {etapa > 0 && (
        <ComReserva reserva={null}>
          <Fossil lugar={lugares.escavacao} etapa={etapa} giro={giro} naAreia={naAreia} />
        </ComReserva>
      )}
    </>
  )
}

function Ninho({
  ninho,
  podeAgir,
  ocupado,
  proteger,
}: {
  ninho: { id: NinhoDoVale; x: number; y: number; z: number }
  podeAgir(): boolean
  ocupado(): boolean
  proteger(): void
}) {
  const { loja } = useJogo()
  const numero = ninho.id.slice(-1)
  useInterativo(ninho.id, {
    ...ninho,
    raio: V.alcance,
    rotulo: () =>
      ocupado()
        ? null
        : loja.getState().salvamento.vale.ninhos.includes(ninho.id)
          ? `Ninho ${numero} cuidado`
          : `Proteger o ninho ${numero} da cinza`,
    agir: () => {
      if (!podeAgir() || ocupado()) return
      if (loja.getState().salvamento.vale.ninhos.includes(ninho.id)) {
        loja.getState().dizer('Você já cuidou deste ninho. Os ovos continuam no lugar.')
      } else proteger()
    },
  })
  return null
}

/** As três ondas de cinza, nuvens cinzas que rolam do vulcão até o ninho (formas do código). */
const NUVEM_DA_ONDA = [
  { x: 0, y: 0, z: 0, r: 0.9 },
  { x: 0.7, y: -0.2, z: 0.3, r: 0.6 },
  { x: -0.6, y: -0.15, z: -0.2, r: 0.7 },
] as const

function OndasDeCinza({
  ondas,
  de,
  ate,
}: {
  ondas: { current: OndasDoNinho }
  de: { x: number; y: number; z: number }
  ate: { x: number; y: number; z: number }
}) {
  const grupos = useRef<(Group | null)[]>([])
  useFrame(() => {
    for (let i = 0; i < ONDAS_DE_CINZA.quantas; i++) {
      const g = grupos.current[i]
      if (!g) continue
      const p = caminhoDaOnda(ondas.current, i)
      const destino = ondas.current.destinos[i]
      // Espantada, some na hora; passou, cobre o ninho e se desfaz um pouco depois.
      g.visible = p >= 0 && destino !== 'espantada' && p < 1.3
      const t = Math.min(1, Math.max(0, p))
      g.position.set(de.x + (ate.x - de.x) * t, ate.y + 0.6, de.z + (ate.z - de.z) * t)
      g.scale.setScalar(p > 1 ? Math.max(0.01, 1 - (p - 1) / 0.3) : 1)
    }
  })
  return (
    <>
      {ONDAS.map((i) => (
        <group
          key={i}
          ref={(g) => {
            grupos.current[i] = g
          }}
          visible={false}
        >
          {NUVEM_DA_ONDA.map((n) => (
            <mesh key={`${n.x},${n.z}`} position={[n.x, n.y, n.z]}>
              <icosahedronGeometry args={[n.r, 1]} />
              <meshStandardMaterial color="#7d8189" transparent opacity={0.75} flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

const ONDAS = Array.from({ length: ONDAS_DE_CINZA.quantas }, (_, i) => i)

/** Quanto do fóssil novo fica enterrado na areia até ser escavado. */
const ENTERRADO = 0.45

function Fossil({
  lugar,
  etapa,
  giro,
  naAreia,
}: {
  lugar: { x: number; y: number; z: number }
  etapa: number
  giro: number
  naAreia: FossilDoVale | null
}) {
  const raiz = useModelo(new URL(propsGlb, import.meta.url).href)
  const osso = useMemo(() => copiarNo(raiz, 'osso'), [raiz])
  const novo = useMemo(() => (naAreia ? copiarNo(raiz, naAreia) : null), [raiz, naAreia])
  const altura = useMemo(
    () => (novo ? new Box3().setFromObject(novo).getSize(new Vector3()).y : 0),
    [novo],
  )
  // O fóssil do dia aparece meio enterrado no lugar do osso; achado, o osso volta.
  if (novo)
    return (
      <group position={[lugar.x, lugar.y - altura * ENTERRADO, lugar.z]} rotation={[0, giro, 0]}>
        <primitive object={novo} dispose={null} />
      </group>
    )
  // O osso mede 0,28 m de altura: metade ainda coberta após a primeira ação.
  return (
    <group
      position={[lugar.x, lugar.y - (etapa === 1 ? 0.14 : 0), lugar.z]}
      rotation={[0, giro, 0]}
    >
      <primitive object={osso} dispose={null} />
    </group>
  )
}
