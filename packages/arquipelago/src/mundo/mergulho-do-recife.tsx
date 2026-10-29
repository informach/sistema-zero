import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useState } from 'react'
import { AnimationMixer, LoopOnce, type Object3D, Vector3 } from 'three'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import labirintoUrl from '../assets/ilhas/recife-labirinto.glb'
import navioUrl from '../assets/ilhas/recife-navio.glb'
import bauUrl from '../assets/itens/bau.glb'
import paginaUrl from '../assets/itens/pagina-diario.glb'
import { lojaDoConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import {
  ACHADOS_DO_RECIFE,
  type AchadoDoRecife,
  guardarAchadoDoRecife,
} from '../sistemas/achados-do-recife'
import { MERGULHO, podeMergulhar, type VolumeDeMergulho } from '../sistemas/mergulho'
import { jogoPausado } from '../sistemas/pausa'
import { liberarObjeto } from './carregar-ilha'
import { lerColisores, tirarNosDeColisao } from './colisores-da-ilha'
import { ColisoresDaIlha, type Troca } from './ilha-completa'
import { useInterativo } from './interativos'
import { FUNDO_DO_MAR } from './medidas'

type Ponto = { x: number; y: number; z: number }
function rodar(p: Ponto, giro: number): Ponto {
  return {
    x: p.x * Math.cos(giro) + p.z * Math.sin(giro),
    y: p.y,
    z: p.z * Math.cos(giro) - p.x * Math.sin(giro),
  }
}
function preparar(g: GLTF, deslocamento: Ponto, giro: number) {
  g.scene.rotation.y = giro
  g.scene.updateMatrixWorld(true)
  const colisores = lerColisores(g.scene)
  tirarNosDeColisao(g.scene)
  const posicao = rodar(deslocamento, giro)
  const ancora = (nome: string) => {
    const no = g.scene.getObjectByName(nome)
    if (!no) throw new Error(`Mergulho sem âncora ${nome}`)
    const p = no.getWorldPosition(new Vector3())
    return { x: p.x + posicao.x, y: p.y, z: p.z + posicao.z }
  }
  const mixer = new AnimationMixer(g.scene)
  for (const clip of g.animations) if (clip.name === 'balancar') mixer.clipAction(clip).play()
  return { g, posicao, colisores, ancora, mixer, troca: { opacidade: 1 } as Troca }
}
type Lugar = ReturnType<typeof preparar>
interface Carga {
  navio: Lugar
  labirinto: Lugar
  bau: GLTF
  pagina: GLTF
  abrirBau: () => void
  soltar: () => void
}

/** Sem cache global. Falha parcial e resposta tardia têm o mesmo descarte. */
async function carregar(giro: number): Promise<Carga> {
  const loader = new GLTFLoader()
  const resultados = await Promise.allSettled(
    [navioUrl, labirintoUrl, bauUrl, paginaUrl].map((u) =>
      loader.loadAsync(new URL(u, import.meta.url).href),
    ),
  )
  const feitos = resultados.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  if (feitos.length !== 4) {
    for (const g of feitos) liberarObjeto(g.scene)
    throw new Error('Não foi possível carregar o mergulho')
  }
  const mixers: AnimationMixer[] = []
  const soltar = () => {
    for (const m of mixers) {
      m.stopAllAction()
      m.uncacheRoot(m.getRoot())
    }
    for (const g of feitos) liberarObjeto(g.scene)
  }
  try {
    const navio = preparar(feitos[0]!, MERGULHO.navio, giro)
    mixers.push(navio.mixer)
    const labirinto = preparar(feitos[1]!, MERGULHO.labirinto, giro)
    mixers.push(labirinto.mixer)
    // Conferir antes de publicar a carga, inclusive se a arte mudar.
    for (const a of ['entrada', 'bau', 'pagina-diario']) navio.ancora(a)
    for (const a of ['entrada', 'saida', 'tesouro']) labirinto.ancora(a)
    const bau = feitos[2]!,
      pagina = feitos[3]!
    const mixer = new AnimationMixer(bau.scene)
    mixers.push(mixer)
    const clip = bau.animations.find((c) => c.name === 'abrir')
    let aberto = false
    const abrirBau = () => {
      if (!clip || aberto) return
      aberto = true
      const a = mixer.clipAction(clip)
      a.setLoop(LoopOnce, 1)
      a.clampWhenFinished = true
      a.play()
      mixer.setTime(clip.duration)
    }
    return { navio, labirinto, bau, pagina, abrirBau, soltar }
  } catch (e) {
    soltar()
    throw e
  }
}

function Achado({
  id,
  ponto,
  volume,
}: {
  id: AchadoDoRecife
  ponto: Ponto
  volume: VolumeDeMergulho
}) {
  const { loja, rastro, movimento } = useJogo()
  const pode = () =>
    volume.ativo &&
    movimento.modo === 'mergulho' &&
    !loja.getState().salvamento.recife[id] &&
    Math.hypot(rastro.x - ponto.x, rastro.z - ponto.z) < 1.5 &&
    Math.abs(rastro.y - (ponto.y + 0.9)) < 0.8
  useInterativo(`mergulho:${id}`, {
    x: ponto.x,
    z: ponto.z,
    raio: 1.5,
    submerso: true,
    rotulo: () => (pode() ? `Guardar ${ACHADOS_DO_RECIFE[id].nome.toLowerCase()}` : null),
    agir() {
      if (!pode()) return
      loja.getState().mudar((s) => guardarAchadoDoRecife(s, id))
      loja
        .getState()
        .dizer(
          id === 'pagina'
            ? 'A página do Recife está no diário, no menu.'
            : `${ACHADOS_DO_RECIFE[id].nome} entrou no álbum. Diversão +15.`,
        )
    },
  })
  return null
}

/** Filho do Recife: posições locais no desenho, mundiais nas regras e interativos. */
export function MergulhoDoRecife({
  modelo,
  centro,
  giro,
  troca,
}: {
  modelo: Object3D
  centro: Ponto
  giro: number
  troca: Troca
}) {
  const { loja, movimento, rastro } = useJogo()
  const [carga, definirCarga] = useState<Carga | null>(null)
  const [falhou, definirFalha] = useState(false)
  const volume = useMemo<VolumeDeMergulho>(() => {
    const no = modelo.getObjectByName('mergulho')
    if (!no) throw new Error('Recife sem âncora mergulho')
    const p = rodar(no.position, giro)
    return {
      id: 'recife',
      x: centro.x,
      z: centro.z,
      raio: MERGULHO.raio,
      fundo: FUNDO_DO_MAR,
      superficie: 0,
      entrada: { x: p.x + centro.x, y: p.y, z: p.z + centro.z },
      ativo: false,
    }
  }, [modelo, centro, giro])
  useEffect(() => {
    let vivo = true,
      atual: Carga | null = null
    carregar(giro)
      .then((c) => {
        if (!vivo) {
          c.soltar()
          return
        }
        atual = c
        definirCarga(c)
      })
      .catch(() => {
        if (vivo) definirFalha(true)
      })
    movimento.mergulhos.push(volume)
    return () => {
      vivo = false
      volume.ativo = false
      const i = movimento.mergulhos.indexOf(volume)
      if (i >= 0) movimento.mergulhos.splice(i, 1)
      atual?.soltar()
    }
  }, [giro, movimento, volume])
  useInterativo('recife:mergulhar', {
    x: volume.entrada.x,
    z: volume.entrada.z,
    raio: MERGULHO.alcance,
    rotulo: () =>
      movimento.modo !== 'chao'
        ? null
        : falhou
          ? 'Mergulho indisponível'
          : volume.ativo
            ? 'Mergulhar'
            : 'Preparando o mergulho',
    agir() {
      if (!podeMergulhar(volume, rastro)) {
        loja
          .getState()
          .dizer(
            falhou
              ? 'O mergulho não carregou. Afaste-se da ilha e volte para tentar de novo.'
              : 'O mergulho está sendo preparado.',
          )
        return
      }
      loja
        .getState()
        .mudar((s) => ({ ...s, posicao: { x: volume.entrada.x, y: 0.65, z: volume.entrada.z } }))
      movimento.pedido = { tipo: 'mergulho', volume }
      loja
        .getState()
        .dizer('Explore com calma. Espaço sobe e Q desce. No toque, use Subir e Descer.')
    },
  })
  useFrame((_, dt) => {
    volume.ativo =
      !!carga?.navio.troca.colisoresNaCena &&
      !!carga.labirinto.troca.colisoresNaCena &&
      troca.opacidade >= 0.99 &&
      troca.colisoresNaCena === true
    if (!carga) return
    const s = loja.getState()
    carga.pagina.scene.visible = !s.salvamento.recife.pagina
    if (s.salvamento.recife.bau) carga.abrirBau()
    if (!jogoPausado(s) && !lojaDoConforto(loja).getState().conforto.menosMovimento) {
      carga.navio.mixer.update(Math.min(dt, 0.1))
      carga.labirinto.mixer.update(Math.min(dt, 0.1))
    }
  })
  const pontos = useMemo(
    () =>
      carga
        ? {
            bau: carga.navio.ancora('bau'),
            pagina: carga.navio.ancora('pagina-diario'),
            tesouro: carga.labirinto.ancora('tesouro'),
          }
        : null,
    [carga],
  )
  if (!carga || !pontos) return null
  return (
    <group name="mergulho-do-recife" position={[centro.x, 0, centro.z]} dispose={null}>
      {[carga.navio, carga.labirinto].map((l) => (
        <group key={l.g.scene.uuid} position={[l.posicao.x, 0, l.posicao.z]}>
          <primitive object={l.g.scene} />
          <ColisoresDaIlha colisores={l.colisores} troca={l.troca} />
        </group>
      ))}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider sensor args={[2.25, MERGULHO.raio]} position={[0, -1.25, 0]} />
      </RigidBody>
      <group position={[pontos.bau.x, pontos.bau.y, pontos.bau.z]} rotation={[0, giro, 0]}>
        <primitive object={carga.bau.scene} />
      </group>
      <group
        position={[pontos.pagina.x, pontos.pagina.y + 0.4, pontos.pagina.z]}
        rotation={[0, giro, 0]}
      >
        <primitive object={carga.pagina.scene} />
      </group>
      {(Object.keys(pontos) as AchadoDoRecife[]).map((id) => (
        <Achado
          key={id}
          id={id}
          volume={volume}
          ponto={{ x: pontos[id].x + centro.x, y: pontos[id].y, z: pontos[id].z + centro.z }}
        />
      ))}
    </group>
  )
}
