import { useFrame } from '@react-three/fiber'
import type { NinhoDoVale } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import propsGlb from '../assets/ilhas/vale-dos-dinos-props.glb'
import { useEstado, useJogo } from '../estado/contexto'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import {
  ACOES_DA_ESCAVACAO,
  cuidarDoNinho,
  deuEspacoAoNinho,
  escavarNoVale,
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
  const locais = useMemo(() => explorarVale(preparada.modelo, preparada.colisores), [preparada])
  const lugares = useMemo(() => {
    const mundo = (p: { x: number; z: number; y?: number }) =>
      paraOMundo({ ...p, y: p.y ?? locais.chegada.y }, meio, giro, { x: 0, y: 0, z: 0 })
    return {
      escavacao: mundo(locais.escavacao),
      pontos: locais.pontos.map(mundo),
      pegadas: locais.pegadas.map((p) => ({ ...mundo(p), giro: p.giro + giro })),
      ninhos: locais.ninhos.map((n) => ({ ...mundo(n), id: n.id })),
    }
  }, [locais, meio, giro])
  const seguido = useRef(0)
  const observando = useRef<NinhoDoVale | null>(null)
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
    rotulo: () => ACOES_DA_ESCAVACAO[loja.getState().salvamento.vale.escavacao] ?? 'Rever o fóssil',
    agir: () => {
      if (!podeAgir()) return
      const antes = loja.getState().salvamento.vale.escavacao
      loja.getState().mudar((s) => escavarNoVale(s, true))
      loja.getState().dizer(FALAS_DA_ESCAVACAO[Math.min(antes, 2)] ?? '')
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
    const ninho = lugares.ninhos.find((n) => n.id === observando.current)
    if (ninho && deuEspacoAoNinho(ninho, rastro, true)) {
      // Sair da ilha ou usar transporte não conclui um cuidado à distância.
      if (Math.hypot(rastro.x - ninho.x, rastro.z - ninho.z) <= V.afastamento + V.alcance) {
        s.mudar((atual) => cuidarDoNinho(atual, ninho.id, true))
        s.dizer(
          `Você deu espaço aos ovos. ${loja.getState().salvamento.vale.ninhos.length} de 3 ninhos cuidados.`,
        )
      }
      observando.current = null
    }
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
          observar={() => {
            observando.current = ninho.id
          }}
        />
      ))}
      {etapa > 0 && (
        <ComReserva reserva={null}>
          <Fossil lugar={lugares.escavacao} etapa={etapa} giro={giro} />
        </ComReserva>
      )}
    </>
  )
}

function Ninho({
  ninho,
  podeAgir,
  observar,
}: {
  ninho: { id: NinhoDoVale; x: number; y: number; z: number }
  podeAgir(): boolean
  observar(): void
}) {
  const { loja } = useJogo()
  const numero = ninho.id.slice(-1)
  useInterativo(ninho.id, {
    ...ninho,
    raio: V.alcance,
    rotulo: () =>
      loja.getState().salvamento.vale.ninhos.includes(ninho.id)
        ? `Ninho ${numero} cuidado`
        : `Observar os ovos do ninho ${numero}`,
    agir: () => {
      if (!podeAgir()) return
      if (loja.getState().salvamento.vale.ninhos.includes(ninho.id)) {
        loja.getState().dizer('Você já cuidou deste ninho. Os ovos continuam no lugar.')
      } else {
        observar()
        loja
          .getState()
          .dizer('Os ovos ficam no ninho. Agora dê alguns passos para longe para deixar espaço.')
      }
    },
  })
  return null
}

function Fossil({
  lugar,
  etapa,
  giro,
}: {
  lugar: { x: number; y: number; z: number }
  etapa: number
  giro: number
}) {
  const raiz = useModelo(new URL(propsGlb, import.meta.url).href)
  const osso = useMemo(() => copiarNo(raiz, 'osso'), [raiz])
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
