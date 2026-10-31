import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import caracol from '../assets/itens/concha-caracol.glb'
import listrada from '../assets/itens/concha-listrada.glb'
import mexilhao from '../assets/itens/concha-mexilhao.glb'
import tigre from '../assets/itens/concha-tigre.glb'
import vieira from '../assets/itens/concha-vieira.glb'
import estrela from '../assets/itens/estrela-do-mar.glb'
import iscaMinhoca from '../assets/itens/isca-minhoca.glb'
import iscaPena from '../assets/itens/isca-pena.glb'
import vara from '../assets/itens/vara-de-pescar.glb'
import { useEstado, useJogo } from '../estado/contexto'
import type { EstadoDoJogo } from '../estado/loja'
import {
  alcancaNaPraia,
  CONCHAS_DA_PRAIA,
  descobriuNaPraia,
  proximoPeixe,
  registrarNaPraia,
} from '../sistemas/colecoes-da-praia'
import { CORPO } from '../sistemas/corpo'
import {
  falaDaIscaDeGraca,
  gastarIsca,
  type Isca,
  iscaDeGracaAparece,
  iscaValendo,
  NOME_NA_FALA,
  PESCA_COM_ISCA,
  pegarIscaDeGraca,
} from '../sistemas/iscas'
import { jogoPausado } from '../sistemas/pausa'
import {
  agirNaPesca,
  cancelarPesca,
  criarPesca,
  passoDaPesca,
  rotuloDaPesca,
} from '../sistemas/pesca'
import { useInterativo } from './interativos'
import { LUGAR_DA_MINHOCA, LUGAR_DA_PENA, PONTO_DA_PESCA } from './lugares-da-praia'
import { alturaDaIlha, PIER } from './medidas'
import { ComReserva, useModelo } from './modelos'

const MODELOS = {
  'concha-caracol': caracol,
  'concha-listrada': listrada,
  'concha-mexilhao': mexilhao,
  'concha-tigre': tigre,
  'concha-vieira': vieira,
  'estrela-do-mar': estrela,
}
function podeInteragir(s: EstadoDoJogo): boolean {
  return !s.acesso.somenteLeitura && !s.visita && !jogoPausado(s)
}

function Concha({ p }: { p: (typeof CONCHAS_DA_PRAIA)[number] }) {
  // Suspende antes de registrar interação: uma peça ainda ausente não pode ser coletada.
  const modelo = useModelo(new URL(MODELOS[p.id], import.meta.url).href)
  const copia = useMemo(() => modelo.clone(true), [modelo])
  const { loja, movimento, rastro } = useJogo()
  const encontrada = useEstado((s) => descobriuNaPraia(s.salvamento, p.id))
  const y = alturaDaIlha(p.x, p.z)
  const ponto = useMemo(() => ({ x: p.x, y, z: p.z }), [p.x, y, p.z])
  const perto = () => movimento.modo === 'chao' && alcancaNaPraia(ponto, rastro, CORPO.doCentroAoPe)
  useInterativo(`praia:${p.id}`, {
    x: p.x,
    z: p.z,
    raio: 1.4,
    rotulo() {
      const s = loja.getState()
      if (!podeInteragir(s) || !perto() || descobriuNaPraia(s.salvamento, p.id)) return null
      return p.observar ? 'Observar a estrela-do-mar' : `Pegar ${p.nome.toLocaleLowerCase('pt-BR')}`
    },
    agir() {
      const s = loja.getState()
      if (!podeInteragir(s) || !perto() || descobriuNaPraia(s.salvamento, p.id)) return
      s.mudar((v) => registrarNaPraia(v, p.id))
      if (!descobriuNaPraia(loja.getState().salvamento, p.id)) return
      s.dizer(
        p.observar
          ? 'A estrela-do-mar ficou no seu lugar. A descoberta está no álbum.'
          : `${p.nome} registrada no álbum e guardada na mochila.`,
      )
    },
  })
  if (encontrada && !p.observar) return null
  return (
    <group name={`colecao-${p.id}`} position={[p.x, y + 0.02, p.z]} scale={3}>
      <primitive object={copia} dispose={null} />
    </group>
  )
}

function Pesca() {
  const modelo = useModelo(new URL(vara, import.meta.url).href)
  const copia = useMemo(() => modelo.clone(true), [modelo])
  const { loja, movimento, rastro } = useJogo()
  const pesca = useRef(criarPesca())
  const perto = () =>
    movimento.modo === 'chao' && alcancaNaPraia(PONTO_DA_PESCA, rastro, CORPO.doCentroAoPe)
  useFrame((_, dt) => {
    const s = loja.getState()
    if (s.visita || s.acesso.somenteLeitura) return cancelarPesca(pesca.current)
    passoDaPesca(pesca.current, dt, jogoPausado(s), perto())
  })
  useInterativo('praia:pesca', {
    x: PONTO_DA_PESCA.x,
    z: PONTO_DA_PESCA.z,
    raio: 1.4,
    rotulo() {
      const s = loja.getState()
      if (!podeInteragir(s) || !perto()) return null
      const isca = iscaValendo(s.isca, s.salvamento.inventario)
      return rotuloDaPesca(pesca.current, isca ? NOME_NA_FALA[isca] : null)
    },
    agir() {
      const s = loja.getState()
      if (!podeInteragir(s) || !perto()) return
      const isca = iscaValendo(s.isca, s.salvamento.inventario)
      const r = agirNaPesca(pesca.current, {
        regra: PESCA_COM_ISCA[isca ?? 'nenhuma'],
        isca,
      })
      if (r.acao !== 'recolheu') {
        s.dizer(
          r.acao === 'lancou'
            ? isca
              ? `A linha está na água com ${NOME_NA_FALA[isca]}. Espere o recado Recolher a linha.`
              : 'A linha está na água. Espere o recado Recolher a linha.'
            : 'Espere o peixe se aproximar. Ainda não precisa recolher.',
        )
        return
      }
      const peixe = proximoPeixe(s.salvamento)
      const nova = !descobriuNaPraia(s.salvamento, peixe.id)
      // A isca do anzol só é gasta agora, com o peixe na linha.
      const usada = r.isca
      s.mudar((v) => registrarNaPraia(gastarIsca(v, usada), peixe.id))
      const depois = loja.getState().salvamento
      if (usada && (depois.inventario[usada] ?? 0) === 0 && s.isca === usada) s.escolherIsca(null)
      if (!descobriuNaPraia(depois, peixe.id)) return
      s.dizer(
        nova
          ? `Descoberta registrada: ${peixe.nome}. O peixe voltou ao mar.`
          : `Mais uma pesca: ${peixe.nome}. Esse peixe já está no álbum e voltou ao mar.`,
      )
    },
  })
  return (
    <group
      name="vara-da-pesca"
      position={[PIER.x - 0.9, 0.64, PONTO_DA_PESCA.z]}
      rotation={[0, 0, -0.25]}
    >
      <primitive object={copia} dispose={null} />
    </group>
  )
}

const MODELOS_DAS_ISCAS: Readonly<Record<Isca, string>> = {
  'isca-minhoca': iscaMinhoca,
  'isca-pena': iscaPena,
}
const LUGARES_DAS_ISCAS: Readonly<
  Record<Isca, { x: number; y: number; z: number; escala: number }>
> = {
  'isca-minhoca': LUGAR_DA_MINHOCA,
  'isca-pena': LUGAR_DA_PENA,
}

/**
 * A isca de graça: a latinha de minhocas no canto da horta e a pena no píer. Só aparece quando a
 * mochila não tem nenhuma daquele tipo; quem quiser guardar mais compra na feira.
 */
function IscaDeGraca({ isca }: { isca: Isca }) {
  const modelo = useModelo(new URL(MODELOS_DAS_ISCAS[isca], import.meta.url).href)
  const copia = useMemo(() => modelo.clone(true), [modelo])
  const { loja, movimento, rastro } = useJogo()
  const aparece = useEstado((s) => iscaDeGracaAparece(s.salvamento, isca))
  const lugar = LUGARES_DAS_ISCAS[isca]
  const perto = () => movimento.modo === 'chao' && alcancaNaPraia(lugar, rastro, CORPO.doCentroAoPe)
  useInterativo(`praia:${isca}`, {
    x: lugar.x,
    z: lugar.z,
    raio: 1.4,
    rotulo() {
      const s = loja.getState()
      if (!podeInteragir(s) || !perto() || !iscaDeGracaAparece(s.salvamento, isca)) return null
      return isca === 'isca-minhoca' ? 'Pegar a latinha de minhocas' : 'Pegar a isca de penas'
    },
    agir() {
      const s = loja.getState()
      if (!podeInteragir(s) || !perto() || !iscaDeGracaAparece(s.salvamento, isca)) return
      s.mudar((v) => pegarIscaDeGraca(v, isca))
      if (iscaDeGracaAparece(loja.getState().salvamento, isca)) return
      s.dizer(falaDaIscaDeGraca(isca))
    },
  })
  if (!aparece) return null
  return (
    <group
      name={`isca-de-graca-${isca}`}
      position={[lugar.x, lugar.y, lugar.z]}
      scale={lugar.escala}
    >
      <primitive object={copia} dispose={null} />
    </group>
  )
}

export function ColecoesDaPraia() {
  return (
    <>
      {CONCHAS_DA_PRAIA.map((p) => (
        <ComReserva key={p.id} reserva={null}>
          <Concha p={p} />
        </ComReserva>
      ))}
      <ComReserva reserva={null}>
        <Pesca />
      </ComReserva>
      <ComReserva reserva={null}>
        <IscaDeGraca isca="isca-minhoca" />
      </ComReserva>
      <ComReserva reserva={null}>
        <IscaDeGraca isca="isca-pena" />
      </ComReserva>
    </>
  )
}
