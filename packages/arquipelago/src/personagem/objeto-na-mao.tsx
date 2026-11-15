import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AVATAR_CATALOG, avatarFileUrl } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { type AnimationClip, type Bone, type Object3D, Quaternion } from 'three'
import { PoseLimpa } from './pose-limpa'

/**
 * Os objetos de mão do jogo (a lanterna, a barra do planador). O objeto é do pack do avatar: uma peça presa ao esqueleto,
 * que o `PackAvatarRig` monta (`equipment`). A arte fez também a pose dos dedos fechados no cabo, um
 * clipe de camada: vale por cima de qualquer animação, só nos ossos dos dedos.
 */
export const LANTERNA_NA_MAO: readonly string[] = ['mao_lanterna']
/** A barra do planador, nas duas mãos (só no modo planar). */
export const BARRA_NAS_MAOS: readonly string[] = ['mao_barra_planador']
export const SEM_OBJETO_NA_MAO: readonly string[] = []

/** Os objetos de mão que o jogo usa (os da pasta `maos/` da arte, em `equipment` no catálogo). */
export type ObjetoDeMao =
  | 'mao_lanterna'
  | 'mao_barra_planador'
  | 'mao_regador'
  | 'mao_balde'
  | 'mao_varinha_luz'
/** O que vai preso ao esqueleto para um objeto (um por vez; nenhum, se o catálogo não o tem). */
export function equipamentoDaMao(objeto: ObjetoDeMao | null): readonly string[] {
  if (!objeto || !AVATAR_CATALOG.equipment?.[objeto]) return SEM_OBJETO_NA_MAO
  if (objeto === 'mao_lanterna') return LANTERNA_NA_MAO
  if (objeto === 'mao_barra_planador') return BARRA_NAS_MAOS
  return [objeto]
}
/**
 * Qual objeto vai na mão: a barra no planador; senão o do gesto (o regador ao regar, o balde cheio);
 * senão a lanterna acesa (que volta depois do gesto). A varinha de luz entra quando o jogo a der.
 */
export function objetoNaMao(o: {
  planando: boolean
  doGesto: ObjetoDeMao | null
  comLanterna: boolean
}): ObjetoDeMao | null {
  if (o.planando) return 'mao_barra_planador'
  if (o.doGesto) return o.doGesto
  return o.comLanterna ? 'mao_lanterna' : null
}

type CamadaDoJogo = NonNullable<typeof AVATAR_CATALOG.base.skeleton.game.layers>[number]

/** As camadas dos dedos (as que não acompanham uma animação: valem sempre). */
const camadasDosDedosDoCatalogo = (): CamadaDoJogo[] =>
  AVATAR_CATALOG.base.skeleton.game.layers?.filter((c) => c.with === undefined) ?? []

/** A camada dos dedos que o catálogo dá a um objeto (a primeira que o cita). */
export function camadaDosDedos(objeto: string) {
  return camadasDosDedosDoCatalogo().find((c) => c.objects.includes(objeto))
}

/**
 * Todas as camadas dos dedos para um objeto: as que o citam e, se nenhuma delas fecha a mão direita,
 * a da mão direita no cilindro fino. O objeto vai no encaixe `mao_direita`, e a arte fez só a
 * pegada esquerda à parte para a barra do planador (o "clipe espelhado"); a direita é a de sempre.
 */
export function camadasDosDedos(objeto: string): CamadaDoJogo[] {
  const todas = camadasDosDedosDoCatalogo()
  const doObjeto = todas.filter((c) => c.objects.includes(objeto))
  const fechaADireita = (c: CamadaDoJogo) => c.bones.some((o) => o.startsWith('RightHand'))
  if (doObjeto.some(fechaADireita)) return doObjeto
  // Objeto de mão sem a pegada dele (o balde e o regador, pela alça): a da mão direita no cilindro
  // fino. Um id que não é objeto do jogo não fecha a mão.
  if (doObjeto.length === 0 && !AVATAR_CATALOG.equipment?.[objeto]) return doObjeto
  const direita = todas.find(fechaADireita)
  return direita ? [direita, ...doObjeto] : doObjeto
}

/** O giro de cada osso da camada, no primeiro quadro do clipe dela (a pose dos dedos é parada). */
export function poseDaCamada(
  clipes: readonly AnimationClip[],
  camada: { id: string; bones: readonly string[] },
): Map<string, Quaternion> {
  const pose = new Map<string, Quaternion>()
  const clipe = clipes.find((c) => c.name === camada.id)
  if (!clipe) return pose
  for (const osso of camada.bones) {
    const trilha = clipe.tracks.find((t) => t.name === `${osso}.quaternion`)
    if (trilha && trilha.values.length >= 4)
      pose.set(osso, new Quaternion().fromArray(trilha.values))
  }
  return pose
}

/**
 * Fecha os dedos no cabo do objeto, depois da pose de cada quadro. Monta depois do avatar, dentro do
 * mesmo `Suspense`: o `useFrame` dele entra depois do mixer, e a pose dos dedos fica por cima da
 * animação que estiver tocando. O mixer não reescreve um osso parado: ao sair (a lanterna guardada),
 * a pose dos dedos que o mixer deixou volta (`PoseLimpa`), senão a mão ficava fechada no nada.
 */
export function DedosNoCabo({
  corpo,
  objeto,
}: {
  corpo: RefObject<Object3D | null>
  objeto: string
}) {
  const { animations } = useGLTF(
    avatarFileUrl(AVATAR_CATALOG.base.skeleton.game.file),
    false,
    false,
  )
  const pose = useMemo(() => {
    const todas = new Map<string, Quaternion>()
    for (const camada of camadasDosDedos(objeto))
      for (const [osso, giro] of poseDaCamada(animations, camada)) todas.set(osso, giro)
    return todas
  }, [animations, objeto])
  const dedos = useRef<[Bone, Quaternion][]>([])
  const limpa = useRef<PoseLimpa | null>(null)
  useEffect(
    () => () => {
      limpa.current?.soltar()
      limpa.current = null
    },
    [],
  )
  useFrame(() => {
    const raiz = corpo.current
    if (!raiz || pose.size === 0) return
    // O avatar pode remontar as peças (e o esqueleto): procura de novo se os ossos saíram da cena.
    if (dedos.current.length === 0 || !dedos.current[0]?.[0].parent) {
      dedos.current = []
      raiz.traverse((o) => {
        const giro = (o as Bone).isBone ? pose.get(o.name) : undefined
        if (giro) dedos.current.push([o as Bone, giro])
      })
      limpa.current = new PoseLimpa(dedos.current.map(([osso]) => osso))
    }
    limpa.current?.antes()
    for (const [osso, giro] of dedos.current) osso.quaternion.copy(giro)
    limpa.current?.depois()
  })
  return null
}

/**
 * As camadas do braço segurando o objeto (o braço aberto, para a lanterna não atravessar o corpo):
 * cada uma acompanha um clipe do pack (`with`). A do `parado_olhando` vale para o parado do jogo
 * (`parado_relaxado`), que não tem a dele.
 */
const CLIPE_DA_CAMADA: Readonly<Record<string, string>> = { parado_olhando: 'parado_relaxado' }
export function camadasDoBraco(objeto: string) {
  return (AVATAR_CATALOG.base.skeleton.game.layers ?? [])
    .filter((c) => c.with !== undefined && c.objects.includes(objeto))
    .map((c) => ({ ...c, clipe: CLIPE_DA_CAMADA[c.with as string] ?? (c.with as string) }))
}

/** O que o braço lê de cada clipe neste quadro: o peso e o instante (s), como o mixer. */
export type PoseDoBraco = Readonly<Record<string, { peso: number; tempo: number }>>

/**
 * O braço que segura o objeto, por cima da animação: em cada clipe que tem a camada do braço (andar
 * de costas, correr, o parado), o giro do braço vai para o da camada no mesmo instante, pelo peso
 * daquele clipe. Nos clipes sem camada, fica o braço da animação. Parte da pose do mixer (`PoseLimpa`).
 */
export function BracoComObjeto({
  corpo,
  objeto,
  pose,
}: {
  corpo: RefObject<Object3D | null>
  objeto: string
  pose: RefObject<PoseDoBraco>
}) {
  const { animations } = useGLTF(
    avatarFileUrl(AVATAR_CATALOG.base.skeleton.game.file),
    false,
    false,
  )
  // Para cada camada: o clipe que ela acompanha, a duração e, por osso, como ler o giro num instante.
  const camadas = useMemo(
    () =>
      camadasDoBraco(objeto).flatMap((camada) => {
        const clipe = animations.find((c) => c.name === camada.id)
        if (!clipe) return []
        const ossos = camada.bones.flatMap((osso) => {
          const trilha = clipe.tracks.find((t) => t.name === `${osso}.quaternion`)
          return trilha ? [{ osso, ler: trilha.createInterpolant() }] : []
        })
        return [{ clipe: camada.clipe, duracao: clipe.duration, ossos }]
      }),
    [animations, objeto],
  )
  const ossos = useRef(new Map<string, Bone>())
  const limpa = useRef<PoseLimpa | null>(null)
  const giro = useMemo(() => new Quaternion(), [])
  useEffect(
    () => () => {
      limpa.current?.soltar()
      limpa.current = null
    },
    [],
  )
  useFrame(() => {
    const raiz = corpo.current
    const atual = pose.current
    if (!raiz || !atual || camadas.length === 0) return
    const algum = ossos.current.values().next().value
    if (ossos.current.size === 0 || !algum?.parent) {
      ossos.current.clear()
      const nomes = new Set(camadas.flatMap((c) => c.ossos.map((o) => o.osso)))
      raiz.traverse((o) => {
        if ((o as Bone).isBone && nomes.has(o.name)) ossos.current.set(o.name, o as Bone)
      })
      limpa.current = new PoseLimpa([...ossos.current.values()])
    }
    limpa.current?.antes()
    for (const camada of camadas) {
      const p = atual[camada.clipe]
      if (!p || p.peso <= 0.001) continue
      const t = camada.duracao > 0 ? p.tempo % camada.duracao : 0
      for (const { osso, ler } of camada.ossos) {
        const b = ossos.current.get(osso)
        if (!b) continue
        giro.fromArray(ler.evaluate(t) as unknown as number[])
        b.quaternion.slerp(giro, Math.min(1, p.peso))
      }
    }
    limpa.current?.depois()
  })
  return null
}
