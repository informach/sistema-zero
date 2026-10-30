import { useFrame } from '@react-three/fiber'
import type { LumiId } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group, Object3D } from 'three'
import borraoGlb from '../assets/lumis/borrao.glb'
import brigadeiroGlb from '../assets/lumis/brigadeiro.glb'
import quindimGlb from '../assets/lumis/quindim.glb'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosPassos } from '../estado/primeiros-passos'
import { abrirRotina } from '../estado/rotina'
import {
  type BorraoDaNoite,
  borroesDaNoite,
  comLanterna,
  criarBorrao,
  FALA_DO_BORRAO_FUGINDO,
  gravarPresos,
  lerPresos,
  lumisNaVila,
  PRENDE_A,
  passoDoBorrao,
  podePrender,
  prender,
  prenderBorrao,
} from '../sistemas/borroes'
import { jogoPausado } from '../sistemas/pausa'
import { momentoDoDia } from '../sistemas/tempo-do-dia'
import { suavizarAngulo } from '../sistemas/zappy'
import { olhosNoInstante, PISCAR, trocarClipe, useCopiaAnimada } from './animado'
import { paraOMundo } from './bosque'
import { Colisores } from './colisores'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { useInterativo } from './interativos'
import { ComReserva } from './modelos'

const BORRAO = new URL(borraoGlb, import.meta.url).href
const MODELOS_DOS_LUMIS: Readonly<Partial<Record<LumiId, string>>> = {
  quindim: new URL(quindimGlb, import.meta.url).href,
  brigadeiro: new URL(brigadeiroGlb, import.meta.url).href,
}

/** O borrão do arquivo tem 1,33 m; na Vila ele flutua com 1 m, para ser visto de longe à noite. */
export const ESCALA_DO_BORRAO = 0.75
/** Quanto ele flutua acima do chão, e quanto sobe e desce no balanço. */
const ALTURA_DO_BORRAO = 0.25
const BALANCO_DO_BORRAO = 0.08
/** Os Lumis da Vila no mesmo tamanho dos da praia (uns 0,5 m). */
export const ESCALA_DOS_LUMIS_DA_VILA = 0.5
/** O lugar do borrão fica a isto da âncora `lumi-N`, puxado para o meio da praça. */
const BORRAO_PARA_DENTRO = 1.5
/** De que distância o Lumi da Vila vira para a criança. */
const LUMI_OLHA_DE = 4
/** De que distância aparece "Ensinar a rotina" perto do Lumi da Vila (fase2-07). */
const LUMI_ENSINA_A = 1.6

const CLIPES_DE_UMA_VEZ = ['virar', 'feliz'] as const

/** Os presos da noite ficam no aparelho, por perfil, para recarregar não trazer o borrão de volta. */
const chaveDosPresos = (perfil: string) => `arquipelago:borroes-presos:${perfil}`

function lerDoAparelho(perfil: string, dia: number): string[] {
  try {
    return lerPresos(localStorage.getItem(chaveDosPresos(perfil)), dia)
  } catch {
    return []
  }
}

function gravarNoAparelho(perfil: string, dia: number, ids: readonly string[]) {
  try {
    localStorage.setItem(chaveDosPresos(perfil), gravarPresos(dia, ids))
  } catch {
    // Sem armazenamento (aba anônima): recarregar a página traz os borrões da noite de volta.
  }
}

interface Ponto {
  x: number
  y: number
  z: number
}

/** As âncoras `lumi-1` a `lumi-4` do modelo, no mundo. */
function ancorasNoMundo(modelo: Object3D, meio: Ponto, giro: number): (Ponto | null)[] {
  return [1, 2, 3, 4].map((n) => {
    const no = modelo.getObjectByName(`lumi-${n}`)
    return no ? paraOMundo(no.position, meio, giro, { x: 0, y: 0, z: 0 }) : null
  })
}

/**
 * Os borrões do Cinza e os Lumis da Vila Doce (fase2-06), montados pelo `VilaViva`. Os Lumis presos
 * moram nas âncoras `lumi-N`, de dia e de noite; à noite saem os borrões da noite (os mesmos em
 * qualquer aparelho, pelo dia do jogo), menos os já presos nela. Regras em `sistemas/borroes.ts`.
 */
export function BorroesDaVila({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: Ponto
  giro: number
}) {
  const { loja, ambiente, plataforma } = useJogo()
  const criadoEm = useEstado((s) => Date.parse(s.salvamento.criadoEm))
  const lumis = useEstado((s) => s.salvamento.lumis)
  const ancoras = useMemo(() => ancorasNoMundo(modelo, meio, giro), [modelo, meio, giro])
  // A noite de agora (o dia do jogo) ou `null` de dia; muda só na troca.
  const [noite, setNoite] = useState<number | null>(null)
  useFrame(() => {
    const agora = ambiente.noite ? momentoDoDia(Date.now(), criadoEm).dia : null
    if (agora !== noite) setNoite(agora)
  })
  // Os borrões da noite saem com os Lumis do começo dela: prender um não troca os outros.
  const [presos, setPresos] = useState<string[]>([])
  const daNoite = useMemo<BorraoDaNoite[]>(
    () => (noite === null ? [] : borroesDaNoite(noite, loja.getState().salvamento.lumis)),
    [noite, loja],
  )
  useEffect(() => {
    setPresos(noite === null ? [] : lerDoAparelho(plataforma.perfil.id, noite))
  }, [noite, plataforma])
  const avisouDaFuga = useRef(false)
  useEffect(() => {
    avisouDaFuga.current = noite === null
  }, [noite])

  const moradores = lumisNaVila(lumis)
  return (
    <group name="borroes-da-vila">
      {moradores.map((m) => {
        const lugar = ancoras[m.ancora]
        const url = MODELOS_DOS_LUMIS[m.lumi]
        return lugar && url ? (
          <ComReserva key={`${m.ancora}-${m.lumi}`} reserva={null}>
            <LumiDaVila
              id={`${m.ancora}-${m.lumi}`}
              lumi={m.lumi}
              url={url}
              lugar={lugar}
              meio={meio}
            />
          </ComReserva>
        ) : null
      })}
      {noite === null
        ? null
        : daNoite.map((b) => {
            const lugar = ancoras[b.ancora]
            return lugar ? (
              <ComReserva key={b.id} reserva={null}>
                <Borrao
                  borrao={b}
                  lugar={lugar}
                  meio={meio}
                  jaPreso={presos.includes(b.id)}
                  aoFugir={() => {
                    if (avisouDaFuga.current) return
                    avisouDaFuga.current = true
                    // Na primeira vez, a dica dos borrões toma o lugar desta fala.
                    if (lojaDosPassos(loja, plataforma).getState().pedirDica('borrao')) return
                    loja.getState().dizer(FALA_DO_BORRAO_FUGINDO)
                  }}
                  aoPrender={() => {
                    const s = loja.getState()
                    const r = prenderBorrao(s.salvamento, b.lumi)
                    s.mudar(() => r.salvamento)
                    // Sem gravar (só leitura, salvamento pausado), o borrão continua solto.
                    if (loja.getState().salvamento !== r.salvamento) return false
                    s.dizer(r.fala)
                    const ids = [...lerDoAparelho(plataforma.perfil.id, noite), b.id]
                    gravarNoAparelho(plataforma.perfil.id, noite, ids)
                    return true
                  }}
                />
              </ComReserva>
            ) : null
          })}
    </group>
  )
}

function Borrao({
  borrao,
  lugar,
  meio,
  jaPreso,
  aoFugir,
  aoPrender,
}: {
  borrao: BorraoDaNoite
  lugar: Ponto
  meio: Ponto
  jaPreso: boolean
  aoFugir(): void
  /** Põe o Lumi no salvamento; `false` quando não deu para gravar. */
  aoPrender(): boolean
}) {
  const { loja, rastro } = useJogo()
  const pausado = useEstado(jogoPausado)
  const raiz = useRef<Group>(null)
  const corpo = useRef<Group>(null)
  const { cena, actions } = useCopiaAnimada(BORRAO, raiz, CLIPES_DE_UMA_VEZ, pausado)
  const estado = useRef(
    (() => {
      // Puxado da âncora para o meio da praça, para não ficar em cima do Lumi que mora ali.
      const dx = meio.x - lugar.x
      const dz = meio.z - lugar.z
      const d = Math.hypot(dx, dz) || 1
      const b = criarBorrao({
        x: lugar.x + (dx / d) * BORRAO_PARA_DENTRO,
        z: lugar.z + (dz / d) * BORRAO_PARA_DENTRO,
      })
      if (jaPreso) b.fase = 'pronto'
      return b
    })(),
  )
  const tocando = useRef<string | null>(null)
  const tempo = useRef(0)

  useEffect(() => {
    if (jaPreso) estado.current.fase = 'pronto'
  }, [jaPreso])

  useInterativo(`borrao-${borrao.id}`, {
    get x() {
      return estado.current.x
    },
    get z() {
      return estado.current.z
    },
    raio: PRENDE_A,
    rotulo: () => {
      const s = loja.getState()
      return podePrender(
        estado.current,
        rastro.x,
        rastro.z,
        comLanterna(s.lanterna, s.salvamento.inventario),
      )
        ? 'Prender com a luz'
        : null
    },
    agir: () => {
      const s = loja.getState()
      if (
        !podePrender(
          estado.current,
          rastro.x,
          rastro.z,
          comLanterna(s.lanterna, s.salvamento.inventario),
        )
      )
        return
      if (aoPrender()) prender(estado.current)
    },
  })

  useFrame((_, dt) => {
    const b = estado.current
    if (!pausado) {
      tempo.current += dt
      const s = loja.getState()
      const luz = comLanterna(s.lanterna, s.salvamento.inventario)
      if (passoDoBorrao(b, Math.min(dt, 0.1), rastro.x, rastro.z, luz) === 'fugiu') aoFugir()
    }
    const quer =
      b.fase === 'preso'
        ? 'preso'
        : b.fase === 'virando'
          ? 'virar'
          : b.fugindo
            ? 'fugir'
            : 'flutuar'
    if (b.fase !== 'pronto' && quer !== tocando.current) {
      trocarClipe(actions, tocando.current, quer, 0.2, `borrao-${borrao.id}`)
      tocando.current = quer
    }
    if (corpo.current) {
      corpo.current.visible = b.fase !== 'pronto'
      corpo.current.position.set(
        b.x,
        lugar.y + ALTURA_DO_BORRAO + Math.sin(tempo.current * 2) * BALANCO_DO_BORRAO,
        b.z,
      )
      // Olha para a criança (fugindo, de costas para ela).
      const rumo = Math.atan2(rastro.x - b.x, rastro.z - b.z) + (b.fugindo ? Math.PI : 0)
      corpo.current.rotation.y = suavizarAngulo(corpo.current.rotation.y, rumo, 4, dt)
    }
  })

  return (
    <group
      ref={corpo}
      name={`borrao-${borrao.id}`}
      position={[estado.current.x, lugar.y + ALTURA_DO_BORRAO, estado.current.z]}
    >
      <group ref={raiz} scale={ESCALA_DO_BORRAO} dispose={null}>
        <primitive object={cena} />
      </group>
    </group>
  )
}

/** Colisor do Lumi da Vila: um cilindro do tamanho do corpo, só para o corpo (`col-morador-`). */
function colisorDoLumi(id: string): ColisorDaIlha[] {
  const raio = 0.28
  const altura = 0.5
  return [
    {
      forma: 'cilindro',
      nome: `col-morador-lumi-${id}`,
      posicao: [0, altura / 2, 0],
      rotacao: [0, 0, 0, 1],
      raio,
      meiaAltura: altura / 2,
    },
  ]
}

function LumiDaVila({
  id,
  lumi,
  url,
  lugar,
  meio,
}: {
  id: string
  lumi: LumiId
  url: string
  lugar: Ponto
  meio: Ponto
}) {
  const { rastro, loja } = useJogo()
  const pausado = useEstado(jogoPausado)
  const raiz = useRef<Group>(null)
  const { cena, actions, olhos } = useCopiaAnimada(url, raiz, CLIPES_DE_UMA_VEZ, pausado)
  const colisores = useMemo(() => colisorDoLumi(id), [id])
  // Perto do Lumi preso, o painel da rotina dele (fase2-07). De fundo: nunca toma o E do borrão.
  useInterativo(`lumi-da-vila-${id}`, {
    x: lugar.x,
    z: lugar.z,
    raio: LUMI_ENSINA_A,
    deFundo: true,
    rotulo: () => 'Ensinar a rotina',
    agir: () => abrirRotina(loja, lumi),
  })
  const descanso = Math.atan2(meio.x - lugar.x, meio.z - lugar.z)
  const olhar = useRef(descanso)
  const tempo = useRef(0)
  const piscarEm = useRef<number>(PISCAR.aCada)

  // Chega comemorando (o borrão acabou de virar ele, ou a ilha acabou de abrir) e descansa.
  useEffect(() => {
    trocarClipe(actions, null, 'feliz', 0, `lumi-${id}`)
    const a = actions.feliz
    const mixer = a?.getMixer()
    if (!a || !mixer) return
    const fim = (e: { action: unknown }) => {
      if (e.action === a) trocarClipe(actions, 'feliz', 'parado', 0.3, `lumi-${id}`)
    }
    mixer.addEventListener('finished', fim)
    return () => mixer.removeEventListener('finished', fim)
  }, [actions, id])

  useFrame((_, dt) => {
    if (pausado) return
    tempo.current += dt
    const perto = (rastro.x - lugar.x) ** 2 + (rastro.z - lugar.z) ** 2 < LUMI_OLHA_DE ** 2
    const alvo = perto ? Math.atan2(rastro.x - lugar.x, rastro.z - lugar.z) : descanso
    olhar.current = suavizarAngulo(olhar.current, alvo, 4, dt)
    if (raiz.current) raiz.current.rotation.y = olhar.current
    olhosNoInstante(olhos, tempo.current, piscarEm, false)
  })

  return (
    <group name={`lumi-da-vila-${id}`} position={[lugar.x, lugar.y, lugar.z]}>
      <group ref={raiz} rotation={[0, descanso, 0]} scale={ESCALA_DOS_LUMIS_DA_VILA} dispose={null}>
        <primitive object={cena} />
      </group>
      <Colisores lista={colisores} />
    </group>
  )
}
