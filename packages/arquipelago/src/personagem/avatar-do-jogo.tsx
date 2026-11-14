import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  AVATAR_CATALOG,
  avatarDoPack,
  avatarFileUrl,
} from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import {
  alturaNoComeco,
  semDeslocamento,
  type VerticalDoClipe,
} from '@sistemazero/avatar-quarto/avatar/pack-clips'
import { PackAvatarRig, PackRigBoundary } from '@sistemazero/avatar-quarto/avatar/pack-rig'
import {
  type ComponentProps,
  type RefObject,
  Suspense,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type AnimationAction,
  type AnimationClip,
  type Group,
  LoopOnce,
  LoopRepeat,
  Vector3,
} from 'three'
import { useEstado } from '../estado/contexto'
import { CORPO } from '../sistemas/corpo'
import {
  CLIPES_DO_JOGO,
  type ClipeDoJogo,
  criarLocomocao,
  criarPoseDosClipes,
  type EntradaDaLocomocao,
  passoDaLocomocao,
  poseDosClipes,
} from '../sistemas/locomocao'
import { descidaDoEntrarNaAgua } from '../sistemas/lugares-dos-clipes'
import { ENTRAR_NO_NADO } from '../sistemas/modos/chao'
import { jogoPausado } from '../sistemas/pausa'
import { LanternaNaMao } from './lanterna-na-mao'
import {
  type AlturaDoChao,
  acharPernas,
  assentarOsPes,
  type PernasDoAvatar,
  pesoDosPes,
  suavizarPeso,
} from './pes-no-chao'

/** O GLB dos clipes de movimento do jogo (bucket privado, pela rota `/api/avatar3d/`). */
const CLIPES_URL = avatarFileUrl(AVATAR_CATALOG.base.skeleton.game.file)
/** O nome dos clipes no mixer: os do pack com outro nome, para não cruzar com os da plataforma. */
export const nomeNoJogo = (id: ClipeDoJogo) => `jogo/${id}`
/** Os clipes que o jogo toca uma vez (o tempo é o da regra; não voltam ao começo sozinhos). */
const UMA_VEZ: readonly ClipeDoJogo[] = [
  'pulo_inicio',
  'pulo_fim',
  'sentar',
  'deitar',
  'subir_borda',
  'entrar_na_agua',
  'sair_da_agua',
]
/** O pulo do pack sobe o corpo; no jogo quem sobe é a física (o agachar fica). */
const NO_PULO: readonly ClipeDoJogo[] = ['pulo_inicio', 'pulo_no_ar', 'pulo_fim']
/**
 * Sentar e deitar ficam com o deslocamento: o desenho já está no assento (ou no colchão) e é o
 * clipe que leva a bacia de onde ela começa em pé até lá.
 */
const COM_O_DESLOCAMENTO: readonly ClipeDoJogo[] = ['sentar', 'deitar']
/** Subindo (a escada, a borda), quem sobe é o corpo da física: o clipe fica sem a subida. */
const SEM_A_SUBIDA: readonly ClipeDoJogo[] = ['subir_escada', 'subir_borda', 'sair_da_agua']

/**
 * Desce o começo do clipe (o `Hips`) `quanto` metros, sumindo em linha reta até o fim: o entrar na
 * água começa de pé no fundo, onde o corpo do jogo está, e termina boiando como a arte fez.
 */
export function comOComecoMaisBaixo(clipe: AnimationClip, quanto: number): AnimationClip {
  const trilha = clipe.tracks.find((t) => t.name === 'Hips.position' && t.getValueSize() === 3)
  if (!trilha) return clipe
  const { times, values } = trilha
  const n = times.length
  const t0 = times[0] ?? 0
  const total = (times[n - 1] ?? t0) - t0
  for (let i = 0; i < n; i++) {
    const f = total > 0 ? ((times[i] ?? t0) - t0) / total : 1
    values[i * 3 + 1] = (values[i * 3 + 1] ?? 0) - quanto * (1 - f)
  }
  return clipe
}

/**
 * Os clipes do jogo prontos para o mixer: sem o deslocamento do `Hips` (o corpo anda pela física),
 * cada um com o vertical que faz sentido para ele. O teto do pulo é a altura do `Hips` no parado.
 */
export function clipesDoJogo(doArquivo: readonly AnimationClip[]): AnimationClip[] {
  const porNome = new Map(doArquivo.map((c) => [c.name, c]))
  const parado = porNome.get('parado_relaxado')
  const emPe = parado ? alturaNoComeco(parado) : null
  const prontos: AnimationClip[] = []
  for (const id of CLIPES_DO_JOGO) {
    const clipe = porNome.get(id)
    if (!clipe) continue
    if (COM_O_DESLOCAMENTO.includes(id)) {
      const copia = clipe.clone()
      copia.name = nomeNoJogo(id)
      prontos.push(copia)
      continue
    }
    const vertical: VerticalDoClipe =
      SEM_A_SUBIDA.includes(id)
        ? 'tendencia'
        : NO_PULO.includes(id) && emPe !== null
          ? { teto: emPe }
          : 'manter'
    const pronto = semDeslocamento(clipe, nomeNoJogo(id), { vertical })
    prontos.push(
      id === 'entrar_na_agua'
        ? comOComecoMaisBaixo(pronto, descidaDoEntrarNaAgua(ENTRAR_NO_NADO))
        : pronto,
    )
  }
  return prontos
}

/**
 * O avatar da plataforma no jogo: o boneco do pack Cute Characters, o mesmo `PackAvatarRig` do Meu
 * avatar, do tamanho que o mundo pede (`CORPO.medidas.scale`; o mundo de hoje usa a ponte de 1,85).
 *
 * O rig põe os pés no chão medindo o corpo em coordenadas de MUNDO e subtraindo da posição LOCAL
 * (feito para o pódio na origem). Aqui o avatar anda pelo mundo, então refazemos a conta no espaço
 * do pai quando ele fica em pé.
 *
 * As animações: `sistemas/locomocao.ts` decide o peso e o tempo de cada clipe a cada quadro, e aqui
 * isso é aplicado às ações do mixer (o tempo é posto à mão: o mixer não avança sozinho). Na pausa
 * nada muda, então a pose fica congelada.
 *
 * Depois da pose: os pés no chão (`chao`, por IK em `pes-no-chao.ts`), também na pausa (o mixer
 * reaplica a pose a cada quadro). As mãos no cipó e na borda vêm dos clipes da arte.
 *
 * ⚠️ Os patins não aparecem até a arte entregar o par do pack (a flag só muda a velocidade).
 */
export function AvatarDoJogo({
  movimento,
  chao,
  comLanterna = false,
}: {
  movimento: RefObject<EntradaDaLocomocao>
  /** O chão embaixo de cada pé (o raio da física); sem ele, os pés ficam como a animação deixa. */
  chao?: AlturaDoChao
  /** Os patins nos pés: ainda não aparecem no boneco do pack (veja acima). */
  comPatins?: boolean
  /** A lanterna acesa na mão direita (fase2-06). */
  comLanterna?: boolean
}) {
  const slotsDoJogo = useEstado((s) => s.avatar.slots)
  const pausado = useEstado(jogoPausado)
  const slots = useMemo(() => avatarDoPack(slotsDoJogo), [slotsDoJogo])
  const personagem = useRef<Group>(null)
  const [emPe, setEmPe] = useState(false)
  const visualRef = useRef<Group>(null)
  const acoes = useRef<Partial<Record<ClipeDoJogo, AnimationAction>>>({})
  const locomocao = useRef(criarLocomocao())
  const pose = useRef(criarPoseDosClipes())

  const aoFicarEmPe = () => {
    const g = personagem.current
    if (g?.parent) {
      // O rig deixou position = -(centro x, pé y, centro z) medidos no MUNDO.
      const noMundo = new Vector3(-g.position.x, -g.position.y, -g.position.z)
      g.parent.updateWorldMatrix(true, false)
      const noPai = g.parent.worldToLocal(noMundo)
      g.position.set(-noPai.x, -noPai.y, -noPai.z)
    }
    setEmPe(true)
  }

  const aoAnimar = useCallback((todas: Record<string, AnimationAction | null>) => {
    const prontas: Partial<Record<ClipeDoJogo, AnimationAction>> = {}
    for (const id of CLIPES_DO_JOGO) {
      const acao = todas[nomeNoJogo(id)]
      if (!acao) continue
      acao.setLoop(UMA_VEZ.includes(id) ? LoopOnce : LoopRepeat, Infinity)
      acao.clampWhenFinished = true
      acao.setEffectiveTimeScale(0)
      acao.setEffectiveWeight(id === 'parado_relaxado' ? 1 : 0)
      acao.play()
      prontas[id] = acao
    }
    acoes.current = prontas
  }, [])

  useFrame((_, dtBruto) => {
    if (pausado) return
    const dt = Math.min(dtBruto, 0.1)
    const l = passoDaLocomocao(locomocao.current, movimento.current, dt)
    const p = poseDosClipes(l, pose.current)
    for (const id of CLIPES_DO_JOGO) {
      const acao = acoes.current[id]
      if (!acao) continue
      acao.setEffectiveWeight(p[id].peso)
      acao.time = Math.min(p[id].tempo, acao.getClip().duration)
    }
  })

  return (
    <group ref={visualRef} name="avatar-visual" visible={emPe}>
      <group name="escala-do-heroi" scale={CORPO.medidas.scale}>
        <PackRigBoundary>
          <Suspense fallback={null}>
            <AvatarComClipes
              slots={slots}
              charRef={personagem}
              onStood={aoFicarEmPe}
              onAnimations={aoAnimar}
            />
            {chao ? (
              <PesNoChao
                chao={chao}
                movimento={movimento}
                raiz={visualRef}
                corpo={personagem}
                pausado={pausado}
              />
            ) : null}
          </Suspense>
        </PackRigBoundary>
      </group>
      {comLanterna && emPe ? (
        <Suspense fallback={null}>
          <LanternaNaMao avatar={visualRef} personagem={personagem} />
        </Suspense>
      ) : null}
    </group>
  )
}

/**
 * Os pés no chão de verdade, depois da pose: monta logo depois do avatar, dentro do mesmo
 * `Suspense`, então o `useFrame` dele entra depois do mixer.
 */
function PesNoChao({
  chao,
  movimento,
  raiz,
  corpo,
  pausado,
}: {
  chao: AlturaDoChao
  movimento: RefObject<EntradaDaLocomocao>
  raiz: RefObject<Group | null>
  corpo: RefObject<Group | null>
  pausado: boolean
}) {
  const pernas = useRef<PernasDoAvatar | null>(null)
  const peso = useRef(0)
  useFrame((_, dt) => {
    const r = raiz.current
    const c = corpo.current
    if (!r?.visible || !c) return
    // O avatar pode remontar as peças (e o esqueleto): procura de novo se o osso saiu da cena.
    if (!pernas.current?.quadril.parent) pernas.current = acharPernas(c)
    if (!pernas.current) return
    if (!pausado) peso.current = suavizarPeso(peso.current, pesoDosPes(movimento.current), dt)
    assentarOsPes(pernas.current, r, chao, peso.current)
  })
  return null
}

/**
 * Os clipes do jogo prontos (suspende até o arquivo chegar). O mesmo arquivo serve o personagem e o
 * fantasma familiar: o `useGLTF` guarda em cache, e cada um prepara a sua cópia.
 */
export function useClipesDoJogo(): AnimationClip[] {
  // `false, false` = sem Draco e sem Meshopt: o decoder é WASM e o Kids não roda WASM.
  const doArquivo = useGLTF(CLIPES_URL, false, false).animations
  return useMemo(() => clipesDoJogo(doArquivo), [doArquivo])
}

/** Lê o arquivo dos clipes dentro do Suspense (o jogo segue enquanto ele chega). */
function AvatarComClipes(props: Omit<ComponentProps<typeof PackAvatarRig>, 'extraClips'>) {
  return <PackAvatarRig {...props} extraClips={useClipesDoJogo()} />
}

useGLTF.preload(CLIPES_URL, false, false)
