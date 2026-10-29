import { useFrame } from '@react-three/fiber'
import { diaDeSaoPaulo } from '@sistemazero/arquipelago-contracts'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointLight } from 'three'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import carnaval from '../assets/festas/carnaval.glb'
import fimDeAno from '../assets/festas/fim-de-ano.glb'
import junina from '../assets/festas/junina.glb'
import lanternas from '../assets/festas/lanternas.glb'
import { useEstado, useJogo } from '../estado/contexto'
import { festaAtual, useFesta } from '../estado/festas'
import {
  avisoDaFesta,
  chaveDoAvisoDaFesta,
  type Festa,
  PAINEL_DA_FOGUEIRA,
} from '../sistemas/festas'
import { jogoPausado } from '../sistemas/pausa'
import { colisoresDaFesta, FOGUEIRA_DA_FESTA, PECAS_DAS_FESTAS } from './arranjo-da-festa'
import { iluminarArte } from './arte-animada'
import { paraOMundo } from './bosque'
import { copiarPecaDaFesta, emendasDoVaral, soltarCatalogo } from './catalogo-da-festa'
import { Colisores } from './colisores'
import { useInterativo } from './interativos'

const ARQUIVOS: Record<Festa, string> = { carnaval, junina, lanternas, 'fim-de-ano': fimDeAno }
const avisados = new WeakMap<object, Set<string>>()
type Lugar = { meio: { x: number; y: number; z: number }; giro: number }

export function FestaNaVila(lugar: Lugar) {
  const festa = useFesta()
  return festa ? <CarregarFesta key={festa} festa={festa} {...lugar} /> : null
}

function CarregarFesta({ festa, ...lugar }: Lugar & { festa: Festa }) {
  const [catalogo, definir] = useState<GLTF | null>(null)
  const { loja } = useJogo()
  useEffect(() => {
    const abortar = new AbortController()
    let carregado: GLTF | null = null
    void (async () => {
      const resposta = await fetch(new URL(ARQUIVOS[festa], import.meta.url), {
        signal: abortar.signal,
      })
      if (!resposta.ok) throw new Error('Catálogo de festa indisponível')
      const gltf = await new GLTFLoader().parseAsync(await resposta.arrayBuffer(), '')
      if (abortar.signal.aborted) {
        soltarCatalogo(gltf.scene)
        return
      }
      carregado = gltf
      definir(gltf)
    })().catch(() => {
      if (!abortar.signal.aborted)
        loja
          .getState()
          .dizer('A decoração da festa não carregou. Volte à Vila para tentar novamente.')
    })
    return () => {
      abortar.abort()
      if (carregado) soltarCatalogo(carregado.scene)
    }
  }, [festa, loja])
  return catalogo ? <FestaCarregada festa={festa} catalogo={catalogo} {...lugar} /> : null
}

function FestaCarregada({ festa, catalogo, meio, giro }: Lugar & { festa: Festa; catalogo: GLTF }) {
  const { ambiente, loja, plataforma, rastro } = useJogo()
  const pausado = useEstado(jogoPausado),
    reduzido = useReducedMotion()
  const luz = useRef<PointLight>(null)
  const pecas = useMemo(
    () =>
      PECAS_DAS_FESTAS[festa]
        .flatMap((p) => emendasDoVaral(catalogo.scene, p))
        .map((p) => copiarPecaDaFesta(catalogo.scene, catalogo.animations, p)),
    [catalogo, festa],
  )
  const colisores = useMemo(() => colisoresDaFesta(festa), [festa])
  const aviso = useMemo(() => {
    const chave = chaveDoAvisoDaFesta(plataforma.perfil.id, festa)
    const ano = diaDeSaoPaulo(new Date()).slice(0, 4)
    let vistos = avisados.get(plataforma)
    if (!vistos) {
      vistos = new Set()
      avisados.set(plataforma, vistos)
    }
    let visto = vistos.has(`${chave}:${ano}`)
    try {
      visto ||= localStorage.getItem(chave) === ano
    } catch {
      /* O aviso continua só nesta montagem. */
    }
    return { chave, ano, vistos, visto }
  }, [plataforma, festa])
  useEffect(
    () => () => {
      for (const p of pecas) p.soltar()
      if (loja.getState().painelAberto === PAINEL_DA_FOGUEIRA) loja.getState().abrirPainel(null)
    },
    [pecas, loja],
  )
  useFrame((_, dt) => {
    if (luz.current) luz.current.intensity = ambiente.noite ? 2 : 0
    for (const p of pecas) {
      if (!pausado) p.mixer.update(Math.min(dt, 0.1) * (reduzido ? 0.5 : 1))
      iluminarArte(p.luzes, ambiente.noite)
    }
    if (
      !aviso.visto &&
      !pausado &&
      !loja.getState().dica &&
      Math.hypot(rastro.x - meio.x, rastro.z - meio.z) < 14
    ) {
      loja.getState().dizer(avisoDaFesta(festa))
      aviso.visto = true
      aviso.vistos.add(`${aviso.chave}:${aviso.ano}`)
      try {
        localStorage.setItem(aviso.chave, aviso.ano)
      } catch {
        /* A memória evita repetir ao remontar a ilha. */
      }
    }
  })
  return (
    <group
      name={`festa-da-vila-${festa}`}
      position={[meio.x, meio.y, meio.z]}
      rotation={[0, giro, 0]}
      dispose={null}
    >
      {pecas.map((p) => (
        <primitive key={p.raiz.name} object={p.raiz} />
      ))}
      <Colisores lista={colisores} />
      {festa === 'junina' ? (
        <pointLight
          ref={luz}
          color="#ffb65b"
          intensity={0}
          distance={5}
          decay={2}
          position={[FOGUEIRA_DA_FESTA.x, FOGUEIRA_DA_FESTA.y + 1, FOGUEIRA_DA_FESTA.z]}
        />
      ) : null}
      {festa === 'junina' ? <FogueiraInterativa meio={meio} giro={giro} /> : null}
    </group>
  )
}

function FogueiraInterativa({ meio, giro }: Lugar) {
  const { loja, plataforma } = useJogo()
  const p = useMemo(
    () => paraOMundo(FOGUEIRA_DA_FESTA, meio, giro, { x: 0, y: 0, z: 0 }),
    [meio, giro],
  )
  useInterativo('fogueira-da-festa', {
    x: p.x,
    z: p.z,
    raio: 2.2,
    rotulo: () => (festaAtual(plataforma) === 'junina' ? 'Cozinhar na fogueira' : null),
    agir: () => {
      if (festaAtual(plataforma) === 'junina') loja.getState().abrirPainel(PAINEL_DA_FOGUEIRA)
    },
  })
  return null
}
