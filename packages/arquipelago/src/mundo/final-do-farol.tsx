import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  AnimationMixer,
  DoubleSide,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import altoGlb from '../assets/ilhas/alto-do-farol.glb'
import irisGlb from '../assets/personagens/iris.glb'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDoFarol, useFarol } from '../estado/farol'
import { useVoz } from '../interface/voz'
import {
  conversarComAIris,
  DURACAO_DO_CORTE,
  fachosAcesos,
  finalPausado,
  finalTerminou,
  IRIS_EM_CASA,
  PAINEL_DA_IRIS,
  PAINEL_DO_FINAL,
  podeSubirOFarol,
} from '../sistemas/final-do-farol'
import {
  ALTO_DO_FAROL,
  ALVOS_DO_FACHO,
  COLISORES_DO_ALTO,
  LUGAR_DA_IRIS,
  ORIGEM_DO_FACHO,
  PORTA_DO_FINAL,
  pontosDoAlto,
  VOLTA_DO_FAROL,
} from './alto-do-farol'
import { liberarObjeto } from './carregar-ilha'
import { Colisores } from './colisores'
import { useInterativo } from './interativos'
import { ComReserva } from './modelos'
import { MoradorDaIlha, type MoradorNoMundo } from './morador'

const IRIS: MoradorNoMundo = {
  quem: 'iris',
  url: new URL(irisGlb, import.meta.url).href,
  painel: PAINEL_DA_IRIS,
  rotulo: 'Conversar com a Íris',
  medidas: IRIS_EM_CASA,
  alturaDaCabeca: IRIS_EM_CASA.alturaDaCabeca,
  comecar: conversarComAIris,
}
const CENTRO = { x: 0, z: 0 }
/** O corte existente dura 600 ms. A troca acontece no meio opaco. */
const MEIO_DO_CORTE = 0.3

export function FinalDoFarol() {
  const { loja, pedidos, rastro, plataforma } = useJogo()
  const farol = lojaDoFarol(loja)
  const etapa = useFarol(loja, (s) => s.etapa)
  const voltou = useEstado((s) => s.salvamento.farol.concluido)
  const jornada = useEstado((s) => s.jornada)
  const voz = useVoz()
  const aparelho = useReducedMotion()
  const preferencia = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  useEffect(() => {
    farol.setState({ menosMovimento: aparelho || preferencia })
  }, [farol, aparelho, preferencia])
  const [modelo, porModelo] = useState<GLTF | null>(null)
  const troca = useRef<{ tempo: number; fez: boolean; fazer: () => void } | null>(null)
  const querSair = useRef(false)
  const cortar = useCallback(
    (fazer: () => void) => {
      if (troca.current) return
      farol.setState({ corte: 0 })
      loja.getState().abrirPainel(PAINEL_DO_FINAL)
      troca.current = { tempo: 0, fez: false, fazer }
    },
    [loja, farol],
  )
  const sair = useCallback(() => {
    if (troca.current) {
      querSair.current = true
      return
    }
    cortar(() => {
      pedidos.teleporte = { ...VOLTA_DO_FAROL }
      pedidos.olharPara = Math.PI / 2
      farol.setState({ etapa: 'fora', tempo: 0 })
      loja.getState().abrirPainel(null)
    })
  }, [cortar, farol, loja, pedidos])
  useEffect(() => {
    farol.setState({
      sair,
      mostrarLuz: () =>
        cortar(() => {
          loja
            .getState()
            .mudar((s) => (s.farol.pagina ? s : { ...s, farol: { ...s.farol, pagina: true } }))
          farol.setState({ etapa: 'fachos', tempo: 0 })
        }),
    })
    return () => {
      farol.setState({ sair: null, mostrarLuz: null })
    }
  }, [farol, sair, cortar, loja])
  useInterativo('porta-do-farol', {
    ...PORTA_DO_FINAL,
    raio: 2,
    rotulo: () =>
      farol.getState().etapa === 'fora' &&
      farol.getState().corte === null &&
      Math.abs(rastro.y - VOLTA_DO_FAROL.y) < 2 &&
      !loja.getState().visita
        ? podeSubirOFarol(loja.getState().jornada)
          ? 'Subir o Farol'
          : 'Ler o recado do Farol'
        : null,
    agir: () => {
      if (farol.getState().etapa !== 'fora' || farol.getState().corte !== null) return
      const s = loja.getState()
      if (!podeSubirOFarol(s.jornada, s.visita !== null)) {
        s.dizer(voz.farolFechado)
        return
      }
      farol.setState({ etapa: 'carregando', menosMovimento: aparelho || preferencia })
      s.abrirPainel(PAINEL_DO_FINAL)
    },
  })
  const dentro = etapa !== 'fora'
  useEffect(() => {
    if (!dentro) {
      porModelo(null)
      return
    }
    const aborto = new AbortController()
    let cena: Object3D | undefined
    let encerrado = false
    void (async () => {
      const resposta = await fetch(new URL(altoGlb, import.meta.url).href, {
        signal: aborto.signal,
      })
      if (!resposta.ok) throw new Error('Não foi possível carregar o alto do Farol')
      const gltf = await new GLTFLoader().parseAsync(await resposta.arrayBuffer(), '')
      cena = gltf.scene
      if (encerrado) {
        liberarObjeto(cena)
        cena = undefined
        return
      }
      farol.setState({ varanda: pontosDoAlto(cena).varanda })
      porModelo(gltf)
    })().catch((erro) => {
      if (encerrado) return
      farol.setState({ etapa: 'fora' })
      loja.getState().abrirPainel(null)
      loja.getState().dizer('A sala não abriu agora. Você pode tentar de novo na porta.')
      plataforma.relatarErro(erro, 'alto-do-farol')
    })
    return () => {
      encerrado = true
      aborto.abort()
      if (cena) liberarObjeto(cena)
    }
  }, [dentro, farol, loja, plataforma])
  useEffect(() => {
    if (!modelo) return
    const p = pontosDoAlto(modelo.scene).entrada
    cortar(() => {
      pedidos.teleporte = { ...p, y: p.y + 1.2 }
      pedidos.olharPara = Math.PI
      farol.setState({ etapa: 'sala' })
      loja.getState().abrirPainel(null)
    })
  }, [modelo, cortar, pedidos, farol, loja])
  useFrame((_, dt) => {
    if (finalPausado(loja.getState(), document.visibilityState === 'visible')) return
    if (troca.current) {
      const corte = troca.current
      corte.tempo += Math.min(dt, 0.1)
      farol.setState({ corte: corte.tempo })
      if (!corte.fez && corte.tempo >= MEIO_DO_CORTE) {
        corte.fez = true
        corte.fazer()
      }
      if (corte.tempo >= DURACAO_DO_CORTE) {
        troca.current = null
        farol.setState({ corte: null })
        if (farol.getState().etapa === 'fora' || farol.getState().etapa === 'sala')
          loja.getState().abrirPainel(null)
        if (querSair.current) {
          querSair.current = false
          sair()
        }
      }
      return
    }
    const s = farol.getState()
    if (
      (s.etapa === 'pagina' || s.etapa === 'fachos' || s.etapa === 'fim') &&
      loja.getState().painelAberto === null
    )
      loja.getState().abrirPainel(PAINEL_DO_FINAL)
    if (s.etapa !== 'fachos') return
    const tempo = s.tempo + Math.min(dt, 0.1)
    if (finalTerminou(tempo, s.menosMovimento)) {
      loja
        .getState()
        .mudar((salvo) =>
          salvo.farol.concluido || !salvo.farol.pagina
            ? salvo
            : { ...salvo, farol: { pagina: true, concluido: true } },
        )
      farol.setState({ tempo, etapa: 'fim' })
    } else farol.setState({ tempo })
  })
  return (
    <>
      {modelo && dentro && <SalaDoFarol modelo={modelo} />}
      {(etapa === 'fachos' || etapa === 'fim') && <FachosDoFinal />}
      {voltou && etapa === 'fora' && podeSubirOFarol(jornada) && (
        <ComReserva reserva={null}>
          <MoradorDaIlha morador={IRIS} lugar={LUGAR_DA_IRIS} meio={CENTRO} />
        </ComReserva>
      )}
    </>
  )
}

function SalaDoFarol({ modelo }: { modelo: GLTF }) {
  const { loja, rastro } = useJogo()
  const farol = lojaDoFarol(loja)
  const naVista = useFarol(loja, (s) => s.etapa === 'fachos' || s.etapa === 'fim')
  const pontos = useMemo(() => pontosDoAlto(modelo.scene), [modelo])
  const mixer = useMemo(() => new AnimationMixer(modelo.scene), [modelo])
  useEffect(() => {
    const clipe = modelo.animations.find((a) => a.name === 'girar')
    if (clipe) mixer.clipAction(clipe).play()
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(modelo.scene)
    }
  }, [modelo, mixer])
  useFrame((_, dt) => {
    if (
      !farol.getState().menosMovimento &&
      !finalPausado(loja.getState(), document.visibilityState === 'visible')
    )
      mixer.update(Math.min(dt, 0.1))
  })
  useInterativo('ultima-pagina', {
    x: pontos.mesa.x,
    z: pontos.mesa.z,
    raio: 2.1,
    rotulo: () =>
      farol.getState().etapa === 'sala' && rastro.y > ALTO_DO_FAROL.y
        ? 'Ler a última página'
        : null,
    agir: () => {
      farol.setState({ etapa: 'pagina', pagina: 0 })
      loja.getState().abrirPainel(PAINEL_DO_FINAL)
    },
  })
  return (
    <group name="sala-do-final" position={[ALTO_DO_FAROL.x, ALTO_DO_FAROL.y, ALTO_DO_FAROL.z]}>
      <primitive object={modelo.scene} dispose={null} visible={!naVista} />
      <Colisores lista={COLISORES_DO_ALTO} />
      <pointLight position={[0, 2.8, 1]} intensity={20} distance={12} color="#fff1d0" />
    </group>
  )
}

function FachosDoFinal() {
  const { loja } = useJogo()
  const quantidade = useFarol(loja, (s) => fachosAcesos(s.tempo, s.menosMovimento))
  const fachos = useMemo(
    () =>
      ALVOS_DO_FACHO.map(({ centro, ilha }) => {
        const inicio = new Vector3(ORIGEM_DO_FACHO.x, ORIGEM_DO_FACHO.y, ORIGEM_DO_FACHO.z)
        const fim = new Vector3(centro.x, 3, centro.z)
        const eixo = inicio.clone().sub(fim)
        return {
          id: ilha.id,
          meio: inicio.add(fim).multiplyScalar(0.5),
          tamanho: eixo.length(),
          giro: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), eixo.normalize()),
        }
      }),
    [],
  )
  return (
    <group name="fachos-das-seis-ilhas">
      {fachos.map((f, i) => (
        <mesh key={f.id} visible={i < quantidade} position={f.meio} quaternion={f.giro}>
          <coneGeometry args={[9, f.tamanho, 12, 1, true]} />
          <meshBasicMaterial
            color="#ffe8a1"
            transparent
            opacity={0.16}
            blending={AdditiveBlending}
            side={DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
