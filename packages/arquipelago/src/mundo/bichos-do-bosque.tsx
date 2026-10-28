import { useFrame } from '@react-three/fiber'
import { BICHOS_DO_BOSQUE, type BichoDoBosque } from '@sistemazero/arquipelago-contracts'
import { useMemo, useRef } from 'react'
import type { Group, Object3D } from 'three'
import cachorroGlb from '../assets/bichos/cachorro-filhote.glb'
import coelhoGlb from '../assets/bichos/coelho-filhote.glb'
import gatoGlb from '../assets/bichos/gato-filhote.glb'
import porquinhoGlb from '../assets/bichos/porquinho-filhote.glb'
import { useEstado, useJogo } from '../estado/contexto'
import { NOME_DO_BICHO } from '../sistemas/bichos'
import {
  acharCaminho,
  comprimentoDoCaminho,
  type Grade,
  type PontoNoChao,
  pontoNoCaminho,
} from '../sistemas/caminho'
import {
  achar,
  type Calor,
  calor,
  deveFalarDoCalor,
  ESCONDERIJOS,
  FALA_DA_PISTA,
  FALA_DO_CALOR,
  maisPertoEscondido,
  RAIO_DA_PISTA,
  RAIO_DE_ACHAR,
} from '../sistemas/esconde'
import { suavizarAngulo } from '../sistemas/zappy'
import { olhosNoInstante, PISCAR, trocarClipe, useCopiaAnimada } from './animado'
import {
  ESCONDERIJOS_NO_MODELO,
  LUGARES_NO_CERCADO,
  paraOMundo,
  rumoNoMundo,
  TOPO_DO_BOSQUE,
} from './bosque'
import { gradeDoBicho } from './chao-livre'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { useInterativo } from './interativos'
import { ComReserva } from './modelos'

export const URL_DO_FILHOTE: Readonly<Record<BichoDoBosque, string>> = {
  cachorro: new URL(cachorroGlb, import.meta.url).href,
  gato: new URL(gatoGlb, import.meta.url).href,
  coelho: new URL(coelhoGlb, import.meta.url).href,
  porquinho: new URL(porquinhoGlb, import.meta.url).href,
}

/**
 * Os bichos do arquivo são pequenos perto do avatar chibi (o gato tem 0,4 de altura e a criança
 * 2,1): no jogo eles ficam deste tamanho, ainda bem menores que ela.
 */
export const ESCALA_DOS_BICHOS = 1.8
/** Correndo para o cercadinho (m/s) e o quanto comemoram antes de sair (s). */
const CORRIDA = { velocidade: 2.6, comemoracao: 1.1 } as const
/** O bicho escondido aparece aos poucos ao chegar a esta distância (a pista já está perto dela). */
const APARECE_DE = RAIO_DA_PISTA * 1.4
/** No cercadinho, ele olha para a criança que chega a esta distância. */
const OLHA_DE_NO_CERCADO = 6
/** Todos os clipes dos bichos repetem (nenhum toca uma vez só). */
const SEM_UMA_VEZ: readonly string[] = []

interface Lugar {
  x: number
  y: number
  z: number
  giro: number
}

/**
 * Os quatro bichos do esconde-esconde (`sistemas/esconde.ts`): escondidos nos esconderijos até
 * serem achados, e depois no cercadinho da Capi. Perto do escondido a pista aparece e o Zappy
 * fala dela; "Achar" (E) guarda o achado, o bicho comemora e corre pelo caminho até o cercadinho.
 * Depois de conhecer a Capi, o Zappy avisa quando a criança esquenta.
 */
export function BichosDoBosque({
  modelo,
  colisores,
  meio,
  giro,
}: {
  modelo: Object3D
  colisores: readonly ColisorDaIlha[]
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const { loja, rastro } = useJogo()
  const achados = useEstado((s) => s.salvamento.bichos.achados)
  // O adotado anda com a criança (`bicho-adotado.tsx`): o lugar dele no cercadinho fica vazio.
  const adotado = useEstado((s) => s.salvamento.bichos.adotado?.id ?? null)

  // Onde cada um se esconde (a âncora do Blender, se houver; senão a medida do código) e os
  // lugares do cercadinho, já no mundo.
  const lugares = useMemo(() => {
    const esconderijos = {} as Record<BichoDoBosque, Lugar>
    for (const b of BICHOS_DO_BOSQUE) {
      const reserva = ESCONDERIJOS_NO_MODELO[b]
      const no = modelo.getObjectByName(ESCONDERIJOS[b].ancora)
      const local = no
        ? { x: no.position.x, y: TOPO_DO_BOSQUE, z: no.position.z }
        : { x: reserva.x, y: TOPO_DO_BOSQUE, z: reserva.z }
      const p = paraOMundo(local, meio, giro, { x: 0, y: 0, z: 0 })
      esconderijos[b] = { ...p, giro: rumoNoMundo(no ? no.rotation.y : reserva.giro, giro) }
    }
    const cercado = LUGARES_NO_CERCADO.map((l) => {
      const p = paraOMundo({ x: l.x, y: TOPO_DO_BOSQUE, z: l.z }, meio, giro, { x: 0, y: 0, z: 0 })
      // De frente para a porteira (o cercadinho abre para o meio da ilha).
      return { ...p, giro: Math.atan2(meio.x - p.x, meio.z - p.z) }
    })
    return { esconderijos, cercado }
  }, [modelo, meio, giro])

  // A grade do chão para o caminho até o cercadinho: montada só no primeiro achado (custa uns
  // 50 ms) e guardada enquanto a ilha estiver ativa. No referencial do modelo.
  const grade = useRef<Grade | null>(null)
  const caminhoAteOCercado = (de: Lugar, ate: Lugar): PontoNoChao[] => {
    if (!grade.current) grade.current = gradeDoBicho(colisores, TOPO_DO_BOSQUE)
    // Do mundo para o modelo e de volta (o giro da ilha ao contrário).
    const paraOModelo = (p: PontoNoChao) => {
      const dx = p.x - meio.x
      const dz = p.z - meio.z
      const c = Math.cos(giro)
      const s = Math.sin(giro)
      return { x: dx * c - dz * s, z: dx * s + dz * c }
    }
    const noModelo = acharCaminho(grade.current, paraOModelo(de), paraOModelo(ate))
    if (!noModelo) return [de, ate]
    return noModelo.map((p) => {
      const w = paraOMundo({ x: p.x, y: 0, z: p.z }, meio, giro, { x: 0, y: 0, z: 0 })
      return { x: w.x, z: w.z }
    })
  }

  // As falas do Zappy: a pista ao chegar perto de um escondido, e o calor quando esquenta.
  const calorAntes = useRef<Calor | null>(null)
  const ultimaFala = useRef(Number.NEGATIVE_INFINITY)
  const pistasDitas = useRef(new Set<BichoDoBosque>())
  const relogio = useRef(0)
  useFrame((_, dt) => {
    relogio.current += dt
    const s = loja.getState()
    // Calado com um painel ou o menu aberto e durante a corrida do percurso (ela tem as falas dela).
    if (s.painelAberto !== null || s.menuAberto || s.corrida) return
    const bichos = s.salvamento.bichos
    const onde = lugares.esconderijos
    const perto = maisPertoEscondido(bichos, rastro, onde)
    if (!perto) return
    const dito = (texto: string) => {
      s.dizer(texto)
      ultimaFala.current = relogio.current
    }
    if (perto.distancia <= RAIO_DA_PISTA && !pistasDitas.current.has(perto.bicho)) {
      pistasDitas.current.add(perto.bicho)
      dito(FALA_DA_PISTA[ESCONDERIJOS[perto.bicho].pista])
      calorAntes.current = calor(perto.distancia)
      return
    }
    if (perto.distancia > APARECE_DE * 1.5) pistasDitas.current.delete(perto.bicho)
    // O calor só depois de conhecer a Capi (é ela quem conta que os bichos se esconderam).
    if (s.salvamento.moradores.capi.conversaEm === null) return
    const agora = calor(perto.distancia)
    if (deveFalarDoCalor(calorAntes.current, agora, relogio.current - ultimaFala.current)) {
      dito(FALA_DO_CALOR[agora])
    }
    calorAntes.current = agora
  })

  return (
    <>
      {BICHOS_DO_BOSQUE.filter((b) => b !== adotado).map((b) => {
        const vez = achados.indexOf(b)
        return (
          <ComReserva key={b} reserva={null}>
            <BichoDoEsconde
              bicho={b}
              esconderijo={lugares.esconderijos[b]}
              cercado={vez >= 0 ? (lugares.cercado[vez] ?? null) : null}
              caminho={caminhoAteOCercado}
            />
          </ComReserva>
        )
      })}
    </>
  )
}

type Fase = 'escondido' | 'comemorando' | 'correndo' | 'cercado'

function BichoDoEsconde({
  bicho,
  esconderijo,
  cercado,
  caminho,
}: {
  bicho: BichoDoBosque
  esconderijo: Lugar
  /** O lugar no cercadinho (`null` enquanto não foi achado). */
  cercado: Lugar | null
  caminho: (de: Lugar, ate: Lugar) => PontoNoChao[]
}) {
  const { loja, rastro } = useJogo()
  const corpo = useRef<Group>(null)
  const raiz = useRef<Group>(null)
  const { cena, actions, olhos } = useCopiaAnimada(URL_DO_FILHOTE[bicho], raiz, SEM_UMA_VEZ)
  const nome = NOME_DO_BICHO[bicho]

  // Já achado ao abrir o jogo: começa no cercadinho. Achado agora: comemora e corre.
  const fase = useRef<Fase>(cercado ? 'cercado' : 'escondido')
  const tempoNaFase = useRef(0)
  const rota = useRef<{ pontos: PontoNoChao[]; total: number; andado: number } | null>(null)
  const pos = useRef({ ...(cercado ?? esconderijo) })
  const olhar = useRef(cercado ? cercado.giro : esconderijo.giro)
  const aparecer = useRef(cercado ? 1 : 0)
  const tocando = useRef<string | null>(null)
  const piscarEm = useRef<number>(PISCAR.aCada)
  const relogio = useRef(0)
  const sentarEm = useRef(4 + Math.random() * 6)

  useInterativo(`achar-${bicho}`, {
    x: esconderijo.x,
    z: esconderijo.z,
    raio: RAIO_DE_ACHAR,
    rotulo: () => (fase.current === 'escondido' && !cercado ? `Achar o ${nome}` : null),
    agir: () => {
      const s = loja.getState()
      if (s.salvamento.bichos.achados.includes(bicho)) return
      s.mudar((v) => ({ ...v, bichos: achar(v.bichos, bicho) }))
      const todos = loja.getState().salvamento.bichos.achados.length === BICHOS_DO_BOSQUE.length
      s.dizer(
        todos
          ? `Você achou o ${nome}. Os quatro bichos voltaram para o cercadinho. Conte para a Capi.`
          : `Você achou o ${nome}. Ele correu para o cercadinho da Capi.`,
      )
    },
  })

  useFrame((_, dt) => {
    relogio.current += dt
    tempoNaFase.current += dt
    const g = corpo.current
    if (!g) return
    const agora = relogio.current
    const dCrianca = Math.hypot(rastro.x - pos.current.x, rastro.z - pos.current.z)

    // Achado agora (o lugar no cercadinho chegou): comemora e depois corre pelo caminho.
    if (fase.current === 'escondido' && cercado) {
      fase.current = 'comemorando'
      tempoNaFase.current = 0
    }
    if (fase.current === 'comemorando' && cercado && tempoNaFase.current > CORRIDA.comemoracao) {
      const pontos = caminho(pos.current as Lugar, cercado)
      rota.current = { pontos, total: comprimentoDoCaminho(pontos), andado: 0 }
      fase.current = 'correndo'
      tempoNaFase.current = 0
    }

    let quer = 'parado'
    let alvoDoOlhar = olhar.current
    if (fase.current === 'escondido') {
      // Longe, some (é esconde-esconde); perto, aparece aos poucos e balança de contente.
      const ve = dCrianca < APARECE_DE ? 1 : 0
      aparecer.current += (ve - aparecer.current) * (1 - Math.exp(-dt * 4))
      quer = dCrianca < RAIO_DA_PISTA ? 'feliz' : 'sentar'
      alvoDoOlhar = esconderijo.giro
    } else if (fase.current === 'comemorando') {
      aparecer.current = 1
      quer = 'feliz'
      alvoDoOlhar = Math.atan2(rastro.x - pos.current.x, rastro.z - pos.current.z)
    } else if (fase.current === 'correndo' && rota.current && cercado) {
      const r = rota.current
      r.andado = Math.min(r.total, r.andado + CORRIDA.velocidade * dt)
      const p = pontoNoCaminho(r.pontos, r.andado)
      pos.current.x = p.x
      pos.current.z = p.z
      alvoDoOlhar = p.rumo
      quer = 'correr'
      if (r.andado >= r.total) {
        fase.current = 'cercado'
        tempoNaFase.current = 0
        pos.current = { ...cercado }
      }
    } else if (fase.current === 'cercado' && cercado) {
      // No cercadinho: parado e de vez em quando sentado; olha para a criança que chega.
      quer = tempoNaFase.current > sentarEm.current ? 'sentar' : 'parado'
      if (tempoNaFase.current > sentarEm.current + 8) {
        tempoNaFase.current = 0
        sentarEm.current = 4 + Math.random() * 6
      }
      alvoDoOlhar =
        dCrianca < OLHA_DE_NO_CERCADO
          ? Math.atan2(rastro.x - pos.current.x, rastro.z - pos.current.z)
          : cercado.giro
    }
    olhar.current = suavizarAngulo(olhar.current, alvoDoOlhar, 6, dt)
    g.position.set(pos.current.x, pos.current.y, pos.current.z)
    g.rotation.y = olhar.current
    const escala = ESCALA_DOS_BICHOS * aparecer.current
    g.scale.setScalar(Math.max(0.0001, escala))
    g.visible = aparecer.current > 0.01

    if (quer !== tocando.current) {
      trocarClipe(actions, tocando.current, quer)
      tocando.current = quer
    }
    olhosNoInstante(olhos, agora, piscarEm, quer === 'feliz')
  })

  return (
    <group ref={corpo} visible={false}>
      <group ref={raiz}>
        <primitive object={cena} />
      </group>
    </group>
  )
}
