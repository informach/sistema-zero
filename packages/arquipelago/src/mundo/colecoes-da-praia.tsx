import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import caracol from '../assets/itens/concha-caracol.glb'
import listrada from '../assets/itens/concha-listrada.glb'
import mexilhao from '../assets/itens/concha-mexilhao.glb'
import tigre from '../assets/itens/concha-tigre.glb'
import vieira from '../assets/itens/concha-vieira.glb'
import estrela from '../assets/itens/estrela-do-mar.glb'
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
import { jogoPausado } from '../sistemas/pausa'
import {
  agirNaPesca,
  cancelarPesca,
  criarPesca,
  passoDaPesca,
  rotuloDaPesca,
} from '../sistemas/pesca'
import { useInterativo } from './interativos'
import { PONTO_DA_PESCA } from './lugares-da-praia'
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
    rotulo: () => (podeInteragir(loja.getState()) && perto() ? rotuloDaPesca(pesca.current) : null),
    agir() {
      const s = loja.getState()
      if (!podeInteragir(s) || !perto()) return
      const acao = agirNaPesca(pesca.current)
      if (acao !== 'recolheu') {
        s.dizer(
          acao === 'lancou'
            ? 'A linha está na água. Espere o recado Recolher a linha.'
            : 'Espere o peixe se aproximar. Ainda não precisa recolher.',
        )
        return
      }
      const peixe = proximoPeixe(s.salvamento)
      s.mudar((v) => registrarNaPraia(v, peixe.id))
      if (!descobriuNaPraia(loja.getState().salvamento, peixe.id)) return
      s.dizer(`Descoberta registrada: ${peixe.nome}. O peixe voltou ao mar.`)
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
    </>
  )
}
