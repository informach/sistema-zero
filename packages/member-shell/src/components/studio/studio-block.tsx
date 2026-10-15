'use client'

import { isStudioProArtifact } from '@sistemazero/core/studio'
import { sessionFetch as fetch } from '../../lib/session-fetch'
import { createStudioPublicationAdapter } from '../../lib/studio-publication-adapter'

import '@sistemazero/studio/styles.css'
import type {
  Project,
  StudioHandle,
  StudioPersistence,
  StudioProRuntimeAdapter,
  StudioShareAdapter,
  StudioShareResult,
} from '@sistemazero/studio'
import { replaceLocalProject, STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import {
  ArrowLeftRight,
  CheckCheck,
  CheckCircle2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Send,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '../../lib/api'
import { cn } from '../../lib/cn'
import { dataUrlBase64ToBlob } from '../../lib/data-url'
import { useReportActivityExpanded } from '../../lib/lesson-activity-expansion'
import type { LessonDraftConflictOutcome, LessonDraftRemote } from '../../lib/lesson-draft-cloud'
import { requestPersistentStorage } from '../../lib/persistent-storage'
import { resolveStudioLessonSeed } from '../../lib/studio-lesson-seed'
import { lessonStudioBackupProjectId, lessonStudioProjectId } from '../../lib/studio-project-id'
import { isInitialTemplateProject } from '../../lib/studio-template'
import type { StudioBlock, StudioStateView, StudioSubmissionResultView } from '../../lib/types'
import { useLessonCopy } from '../lesson-copy-context'
import {
  LessonDraftStatus,
  useLessonDraftEditor,
  useLessonDraftState,
} from '../lesson-draft-status'
import { useLessonPlayer } from '../lesson-player-context'
import { EXPANDED_EXIT_ATTR, EXPANDED_EXIT_EDITOR, LessonVideoToggle } from '../lesson-video-float'
import { VoiceInputButton } from '../voice-input/voice-input-button'
import {
  diskFingerprint,
  prepareStudioLessonDraft,
  resolveStudioConflict,
  type StudioDraftDeps,
  studioDraftProducer,
  swapOtherVersion,
} from './lesson-studio-draft'
import { SectionProjectCheck } from './section-project-check'

// "Compartilhar" da AULA = UMA vez só. O projeto da aula tem começo/meio/fim: a
// criança termina, publica no Mural, pronto — não fica republicando (cada republish
// hoje cria um post NOVO). Trava persistida LOCAL por (perfil, bloco) via a chave do
// projeto (sobrevive a refresh). O Estúdio Completo (projeto livre) NÃO passa por
// aqui — lá o compartilhar segue ilimitado. Guardado contra ambiente sem localStorage.
const SHARED_FLAG_PREFIX = 'sz:studio:shared:'
function readSharedFlag(projectId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SHARED_FLAG_PREFIX + projectId) === '1'
  } catch {
    return false
  }
}
function writeSharedFlag(projectId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHARED_FLAG_PREFIX + projectId, '1')
  } catch {
    // Sem localStorage (modo privado): a trava vale só nesta sessão (estado em memória).
  }
}

// "Expandir" (overlay de tela cheia) é estado de VISTA efêmero, mas precisa SOBREVIVER a uma
// remontagem do bloco na mesma página (ex.: a revisão do bloco mudou): um useState comum voltaria a
// false e a criança cairia da tela cheia. Guardamos por projeto num Map de MÓDULO (um F5 real limpa
// = volta ao normal). ⚠️ Correção de 11/10/2026: o `router.refresh()` NÃO remonta o bloco (as keys
// do player são estáveis); o que voltava do zero era o Shell do editor, re-semeado pelo efeito de
// semente (ver `sementeRef`). E com um build novo no servidor o refresh vira recarregamento da
// página, que zera o Map: por isso o player ADIA as atualizações enquanto há atividade ampliada
// (`useLessonRefresh`). Só "Reduzir" ou Esc tiram da tela cheia, nunca o envio.
const expandedByProject = new Map<string, boolean>()

interface Props {
  blockId: string
  content: StudioBlock
  /** Estado da entrega vindo do GET da aula (já enviou? quando?). */
  studioState: StudioStateView | null
  /**
   * Liga o botão "Compartilhar" (publicar no Mural) na Topbar do editor. O kids passa
   * `enableShare={Boolean(content.showcase?.enabled)}` → o botão aparece SÓ no bloco da ÚLTIMA
   * aula do projeto (a vitrine), substituindo o antigo "Publicar no Mural" da `LessonCelebration`
   * (mesma ação, e o Compartilhar ainda dá descrição editável + link público de jogar). Nas aulas
   * intermediárias fica OFF (a criança não publica antes de terminar). A elegibilidade real é do
   * backend (o publish 409 se o bloco não é vitrine). Default OFF.
   */
  enableShare?: boolean
  /**
   * Chamado quando o projeto é publicado no Mural pelo "Compartilhar" (com os links). O kids usa
   * pra abrir a CELEBRAÇÃO (overlay do Zappy + "Jogar"); o `ShareDialog` fecha sem mostrar a
   * própria tela de sucesso (ver `StudioShareAdapter.onPublished`).
   */
  onShared?: (result: StudioShareResult) => void
  /**
   * Faz o editor PREENCHER a altura do pai (em vez da altura fixa) — usado no "modo
   * criação guiada" do kids (Estúdio à direita, ocupando a coluna inteira ao lado do
   * vídeo). O pai precisa ser um flex column com altura definida.
   */
  fillHeight?: boolean
}

// O Estúdio da sala ao vivo só carrega na sala: as aulas gravadas não pagam por ele.
const LiveBlockWorkspace = dynamic(
  () => import('../live/live-workspace').then((module) => module.LiveBlockWorkspace),
  { ssr: false },
)

type StudioModule = typeof import('@sistemazero/studio')
type StudioComponent = StudioModule['StudioLesson']

/**
 * Bloco Estúdio: renderiza o @sistemazero/studio pré-configurado pelo admin (versão
 * LIMITADA — sem gerenciamento de projetos; terminal/IA/export OFF). O rascunho do
 * aluno persiste LOCAL (IndexedDB nativo da lib, chaveado por bloco); "Enviar para o
 * professor" sobe o MESMO JSON do "Exportar projeto" — destrava a conclusão da aula
 * (gate do backend). "Expandir" leva o editor à tela cheia para trabalhar melhor.
 *
 * Carregado SÓ no client (Monaco/Blockly/IndexedDB não existem no SSR): o import
 * dinâmico do editor roda dentro de um effect — o server renderiza só o placeholder.
 */
export function StudioBlockView(props: Props) {
  const player = useLessonPlayer()
  const { estudio } = useLessonCopy()
  // Estável entre renders: o projeto ao vivo é memorizado e só re-renderiza quando a curadoria muda.
  const { level, allowBlocks, allowCategories, allowedModes, allowLevelReveal } = props.content
  const curation = useMemo(
    () => ({ level, allowBlocks, allowCategories, allowedModes, allowLevelReveal }),
    [level, allowBlocks, allowCategories, allowedModes, allowLevelReveal],
  )
  // ⭐ Aula de curso AO VIVO na sala (14/10/2026): o bloco é o PROJETO AO VIVO da criança (um
  // projeto só, com a ajuda da professora), sem rascunho local nem "Enviar para a equipe". A
  // curadoria é a do bloco. Fora da sala o contexto não traz `liveWorkspace` e nada muda.
  if (player?.liveWorkspace)
    return (
      <LiveBlockWorkspace
        workspace={player.liveWorkspace}
        blockId={props.blockId}
        title={estudio.titulo}
        fillHeight={props.fillHeight}
        curation={curation}
      />
    )
  return <LessonStudioBlockView {...props} />
}

function LessonStudioBlockView({
  blockId,
  content,
  studioState,
  enableShare,
  onShared,
  fillHeight,
}: Props) {
  const player = useLessonPlayer()
  const { estudio, rascunho } = useLessonCopy()
  const lessonId = player?.lessonId ?? ''
  // Id estável por bloco E por PERFIL (`viewerId`): irmãos no mesmo navegador não misturam o
  // rascunho. ⚠️ Charset seguro (sem `:`): id inválido vira ULID aleatório → perde tudo no refresh.
  const projectId = lessonStudioProjectId(blockId, player?.viewerId)
  const backupId = lessonStudioBackupProjectId(projectId)
  // O rascunho guardado na CONTA (10/10/2026): só com o app que fala com a nuvem (o Kids), com
  // perfil e numa aula de verdade. Sem ele, o bloco segue só com o rascunho local, como sempre.
  const draftChannel = player?.lessonDrafts?.studio
  const channel =
    draftChannel?.supported && player?.viewerId && player.lessonId ? draftChannel : null
  const draftState = useLessonDraftState(channel, blockId)

  const [StudioLesson, setStudioLesson] = useState<StudioComponent | null>(null)
  const [studioMod, setStudioMod] = useState<StudioModule | null>(null)
  // A "outra versão" guardada neste navegador (o conflito entre dois computadores).
  const [hasOther, setHasOther] = useState(false)
  const [otherOpen, setOtherOpen] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [otherNote, setOtherNote] = useState<string | null>(null)
  // A conta tinha um trabalho que este aparelho não conhecia e ele abriu por cima (primeiro contato).
  const [contaNote, setContaNote] = useState<string | null>(null)
  // Enquanto a versão da conta sobe para cima, o editor fica parado e nada sobe: um salvamento
  // automático no meio gravaria o trabalho antigo por cima dela (e depois subiria por cima da conta).
  const [trazendoDaConta, setTrazendoDaConta] = useState(false)
  const trazendoRef = useRef(false)
  // "Mudou depois do envio": a impressão do que foi enviado × a do projeto de agora.
  const [sentFingerprint, setSentFingerprint] = useState<string | null>(
    studioState?.contentFingerprint ?? null,
  )
  const [currentFingerprint, setCurrentFingerprint] = useState<string | null>(null)
  // A preparação (qual versão abre) roda UMA vez por rascunho, e quem chega depois ESPERA a mesma:
  // um `router.refresh()` no meio dela reexecuta o efeito, e pular a espera abriria o disco antigo.
  const preparing = useRef<{ projectId: string; promise: Promise<{ other: boolean }> } | null>(null)
  // O último envio (hora e impressão) entra na decisão de qual versão abrir. Num ref: a decisão
  // roda uma vez por rascunho, e um reenvio não deve recarregar o editor.
  const envioRef = useRef<{ at: number; fingerprint: string | null } | null>(null)
  envioRef.current =
    studioState?.submitted && studioState.submittedAt
      ? {
          at: Date.parse(studioState.submittedAt),
          fingerprint: studioState.contentFingerprint ?? null,
        }
      : null
  // O que a semente lê do bloco, num ref (11/10/2026). O conteúdo chega com identidade NOVA a cada
  // `router.refresh()` da aula, mesmo sem mudar nada: nas dependências do efeito abaixo, toda
  // atualização (Verificar, vídeo a 90%, quiz, envio) re-semeava o editor, e o `StudioCore`
  // desmontava o Shell inteiro (blocos, código e prévia voltavam do zero; o relato foi "recarregou
  // os bloquinhos"). Conteúdo novo DE VERDADE muda a revisão do bloco, e o player remonta pela `key`.
  const sementeRef = useRef({
    initialProject: content.initialProject,
    chain: content.chain,
    submitted: studioState?.submitted ?? false,
  })
  sementeRef.current = {
    initialProject: content.initialProject,
    chain: content.chain,
    submitted: studioState?.submitted ?? false,
  }
  const [seed, setSeed] = useState<Project | null>(null)
  const [seedLoadFailure, setSeedLoadFailure] = useState<{
    projectId: string
    attempt: number
  } | null>(null)
  const [seedLoadAttempt, setSeedLoadAttempt] = useState(0)
  const seedLoadFailed =
    seedLoadFailure?.projectId === projectId && seedLoadFailure.attempt === seedLoadAttempt
  const [studioVersion, setStudioVersion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(studioState?.submitted ?? false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(studioState?.submittedAt ?? null)
  // "Compartilhar" da aula é 1 vez só (ver helper): trava depois do 1º publish bem-sucedido.
  const [alreadyShared, setAlreadyShared] = useState<boolean>(() => readSharedFlag(projectId))
  const [score, setScore] = useState<number | null>(studioState?.lastScore ?? null)
  const [passed, setPassed] = useState<boolean>(studioState?.passed ?? false)
  // "O professor já conferiu": some ao reenviar (a versão nova ainda não foi vista).
  const [reviewed, setReviewed] = useState<boolean>(studioState?.reviewed ?? false)
  const [xp, setXp] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(() => expandedByProject.get(projectId) ?? false)
  // Confirmação antes de enviar: o envio destrava/regrava a entrega no professor —
  // um clique sem querer mandava um projeto vazio (relatado pela usuária).
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Aviso anti-sobrescrita: reenviar o TEMPLATE por cima de uma entrega feita (editor semeado
  // do projeto inicial num navegador novo + "Reenviar" = perde o jogo entregue). Calculado ao
  // ABRIR o confirm (o projeto vivo só existe no handle) — não bloqueia, só avisa.
  const [templateWarning, setTemplateWarning] = useState(false)
  // Recado OPCIONAL do aluno ao professor, digitado no modal de confirmação.
  const [message, setMessage] = useState('')
  // O recado tem texto que veio da fala (botão "Falar"): a equipe vê o chip "falado".
  const [messageSpoken, setMessageSpoken] = useState(false)
  // A fala ainda vira texto: o "Enviar" espera (senão o recado sai sem ela).
  const [voiceBusy, setVoiceBusy] = useState(false)
  const MESSAGE_MAX = 1000
  // "Trazer o que eu enviei": puxa do servidor o projeto que o aluno enviou e
  // substitui o editor (o editor semeia do rascunho LOCAL — defasa se terminou em
  // outro PC). Confirmação porque SUBSTITUI o que está aberto aqui.
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const [restartOpen, setRestartOpen] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [restartNote, setRestartNote] = useState<string | null>(null)

  const activity = content.activity
  const passingScore = activity?.passingScore
  const isProLesson = content.initialProject.kind === 'pro'

  const proRuntime = useMemo<StudioProRuntimeAdapter | undefined>(() => {
    if (!isProLesson || !player?.courseSlug || !lessonId) return undefined
    return {
      limits: STUDIO_PRO_BUILD_LIMITS,
      async build({ project, signal }) {
        const res = await fetch('/api/studio/pro-runtime/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseSlug: player.courseSlug,
            lessonId,
            blockId,
            // Assets seguem como materiais; o BFF valida e materializa os bytes.
            project: {
              kind: 'pro',
              tree: project.tree,
              assets: project.assets,
              proMeta: project.proMeta,
            },
          }),
          signal,
        })
        const body = (await res.json().catch(() => null)) as {
          artifact?: unknown
          output?: string
          durationMs?: number
          error?: { message?: string; output?: string }
        } | null
        if (!res.ok || !body || !isStudioProArtifact(body.artifact)) {
          const error = new Error(body?.error?.message ?? 'Não foi possível compilar o projeto.') as
            | (Error & { output?: string })
            | Error
          if (body?.error?.output) (error as Error & { output?: string }).output = body.error.output
          throw error
        }
        return { artifact: body.artifact, output: body.output, durationMs: body.durationMs }
      },
    }
  }, [isProLesson, player?.courseSlug, lessonId, blockId])

  const handleRef = useRef<StudioHandle | null>(null)

  const draftDeps = useMemo<StudioDraftDeps | null>(
    () =>
      studioMod && channel ? { studio: studioMod, channel, blockId, projectId, backupId } : null,
    [studioMod, channel, blockId, projectId, backupId],
  )
  // Reabre o editor com o que está no disco (depois de trocar as versões de lugar).
  const reabrirDoDisco = useCallback(async () => {
    if (!studioMod) return
    const project = await resolveStudioLessonSeed({
      local: () => studioMod.createLocalPersistenceAdapter().load(projectId),
      initial: { ...(content.initialProject as Project), id: projectId },
    })
    setSeed(project)
    setStudioVersion((version) => version + 1)
  }, [studioMod, projectId, content.initialProject])
  // O conflito na subida (`resolveStudioConflict`). Num ref porque a fila guarda o callback e ele
  // precisa do editor de agora. No primeiro contato a versão da conta passa para cima: guarda o
  // que está na tela antes e reabre o editor com ela.
  const conflitoRef = useRef<
    (
      deps: StudioDraftDeps,
      remote: LessonDraftRemote,
      firstContact: boolean,
    ) => Promise<LessonDraftConflictOutcome | undefined>
  >(async () => undefined)
  conflitoRef.current = async (deps, remote, firstContact) => {
    if (firstContact) {
      trazendoRef.current = true
      setTrazendoDaConta(true)
    }
    try {
      if (firstContact) await handleRef.current?.save().catch(() => {})
      const desfecho = await resolveStudioConflict(deps, remote, firstContact)
      if (desfecho.kept) setHasOther(true)
      if (desfecho.opened) {
        await reabrirDoDisco()
        setContaNote(rascunho.trouxeDaConta)
      }
      return desfecho.adoptedAt === null
        ? undefined
        : { adopted: { updatedAt: desfecho.adoptedAt } }
    } finally {
      trazendoRef.current = false
      setTrazendoDaConta(false)
    }
  }
  // Estável: só lê o ref, então a fila pode guardar o callback sem prendê-lo a um render velho.
  const aoConflitar = useCallback(
    (deps: StudioDraftDeps) =>
      (remote: LessonDraftRemote, { firstContact }: { firstContact: boolean }) =>
        conflitoRef.current(deps, remote, firstContact),
    [],
  )
  // Sobe o rascunho para a conta (o produtor relê o disco na hora da subida). Num ref porque o
  // adaptador de persistência abaixo é criado UMA vez por editor.
  const subirRascunho = useCallback(() => {
    if (!draftDeps || trazendoRef.current) return
    draftDeps.channel.enqueue(
      blockId,
      studioDraftProducer(draftDeps, setCurrentFingerprint),
      aoConflitar(draftDeps),
    )
  }, [draftDeps, blockId, aoConflitar])
  const subirRef = useRef(subirRascunho)
  subirRef.current = subirRascunho
  // O salvamento LOCAL de sempre, e depois a subida. ⚠️ Espalha o adaptador local inteiro:
  // `scopeIdentity`, `appliesSavesInCallOrder` e o `loadBlocksState` continuam valendo.
  const persistence = useMemo<StudioPersistence>(() => {
    if (!studioMod || !channel) return 'local'
    const local = studioMod.createLocalPersistenceAdapter()
    return {
      ...local,
      save: async (project) => {
        await local.save(project)
        subirRef.current()
      },
    }
  }, [studioMod, channel])

  // Só uma fonte AUSENTE permite tentar a próxima. Uma falha de leitura ou de
  // conversão deve bloquear o editor, sem semear outro projeto por cima do trabalho.
  useEffect(() => {
    let active = true
    setSeedLoadFailure(null)
    // O rascunho vive no IndexedDB: pede persistência p/ o navegador não despejá-lo
    // (Safari ~7 dias sem visita; pressão de disco). Best-effort, 1× por sessão.
    requestPersistentStorage()
    void (async () => {
      const mod = await import('@sistemazero/studio')
      if (!active) return
      // A LIÇÃO usa o store LOCAL padrão (isolada por perfil pelo id do projeto). Reseta o
      // namespace caso o Estúdio Completo o tenha trocado numa visita anterior nesta sessão.
      mod.setStudioStorageNamespace('')
      setStudioLesson(() => mod.StudioLesson)
      setStudioMod(mod)
      const readSavedProject = async (source: 'studio-submission' | 'studio-carryover') => {
        const result = await apiGet<{ project: unknown | null }>(
          `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/${source}`,
        )
        return result?.project ? { ...(result.project as Project), id: projectId } : null
      }
      // A versão da CONTA entra antes de o editor montar (uma vez por rascunho): depois disto a
      // ordem de sempre, com o local primeiro, já abre a versão mais nova.
      if (channel) {
        if (preparing.current?.projectId !== projectId) {
          const deps = { studio: mod, channel, blockId, projectId, backupId }
          preparing.current = {
            projectId,
            promise: prepareStudioLessonDraft({
              ...deps,
              submission: envioRef.current,
              readSubmission: () => readSavedProject('studio-submission'),
            }).then((preparo) => {
              if (preparo.upload)
                channel.enqueue(
                  blockId,
                  studioDraftProducer(deps, setCurrentFingerprint),
                  aoConflitar(deps),
                )
              return preparo
            }),
          }
        }
        try {
          const preparo = await preparing.current.promise
          if (!active) return
          setHasOther(preparo.other)
          setCurrentFingerprint(await diskFingerprint(mod, projectId))
        } catch (error) {
          console.warn('[rascunho-da-fase] não deu para trazer a versão da conta', error)
        }
      }
      const semente = sementeRef.current
      const project = await resolveStudioLessonSeed({
        local: () => mod.createLocalPersistenceAdapter().load(projectId),
        submitted:
          lessonId && semente.submitted ? () => readSavedProject('studio-submission') : undefined,
        carryover:
          semente.chain && lessonId ? () => readSavedProject('studio-carryover') : undefined,
        initial: { ...(semente.initialProject as Project), id: projectId },
      })
      if (active) setSeed(project)
    })().catch(() => {
      if (!active) return
      setSeed(null)
      setSeedLoadFailure({ projectId, attempt: seedLoadAttempt })
    })
    return () => {
      active = false
    }
  }, [projectId, lessonId, blockId, seedLoadAttempt, channel, backupId, aoConflitar])

  // "Expandir" é uma SOBREPOSIÇÃO em tela cheia por CSS (não a Fullscreen API nativa): a
  // API restringe a pintura à subárvore do elemento, então menus/diálogos PORTALADOS no
  // body (três-pontinhos do editor, "Enviar?", toasts) saíam FORA da camada de tela cheia
  // → invisíveis e o clique "não fazia nada". Como overlay fixo (z-50, acima da navbegação
  // z-40), tudo isso fica por cima e o botão "Reduzir" mora no cabeçalho DENTRO do overlay.
  // Esc também fecha, mas só quando NÃO há menu/diálogo aberto (aí o Esc é deles).
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('[role="menu"],[role="dialog"]')) return
      setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  // Espelha o estado atual no Map de módulo: sobrevive a uma remontagem do bloco dentro da mesma
  // página (o initializer acima o restaura). Um recarregamento da página zera o Map. Fonte única
  // p/ toggle, Esc e "Reduzir".
  useEffect(() => {
    expandedByProject.set(projectId, expanded)
  }, [projectId, expanded])

  // (O editor relayouta sozinho ao mudar de tamanho — BlocklyPanel/MonacoTabs têm
  // ResizeObserver no container; não precisa disparar resize manual.)
  const toggleExpanded = useCallback(() => setExpanded((v) => !v), [])

  // Expandido = overlay `fixed`: a barra de rolagem da PÁGINA atrás dele só confunde (rola
  // mas nada se move). Trava o scroll do body enquanto expandido (refcontada com o <Dialog>,
  // p/ fechar o "Enviar?" por cima não destravar cedo e a barra fantasma não voltar).
  useBodyScrollLock(expanded)
  // O vídeo da seção sai de baixo do editor expandido (o flutuante da aula).
  useReportActivityExpanded(expanded)

  const submit = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return
    setSubmitting(true)
    setError(null)
    try {
      // "Envio em dia": a impressão do que vai é a do DISCO, a mesma régua do rascunho guardado
      // na conta. Salva antes (o autosave é debounced). Se o disco falhar, o envio vai assim
      // mesmo com o que está na tela, sem impressão (o critério deixa passar).
      const saved = await handle.save().then(
        () => true,
        () => false,
      )
      const project = handle.getProject()
      if (!project) return
      const fingerprint = saved && studioMod ? await diskFingerprint(studioMod, projectId) : null
      // O rascunho sobe junto, em tentativa: a entrega à equipe nunca depende da nuvem dele.
      if (channel) {
        subirRef.current()
        await channel.flush(4000).catch(() => {})
      }
      // Resultado da auto-correção rodada no editor (correção híbrida): o servidor
      // RECALCULA a estrutura e registra estes p/ comportamento/teste/código.
      const run = handleRef.current?.getActivityResult() ?? null
      const results = run
        ? run.results.map((r) => ({ checkId: r.checkId, passed: r.passed, message: r.message }))
        : undefined
      // Recado opcional ao professor (trim → omite se vazio).
      const note = message.trim()
      const res = await apiSend<StudioSubmissionResultView>(
        `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/studio-submission`,
        'POST',
        {
          project,
          ...(activity ? { results } : {}),
          ...(note ? { message: note } : {}),
          ...(note && messageSpoken ? { messageSpoken: true } : {}),
          ...(fingerprint ? { fingerprint } : {}),
        },
      )
      setSentFingerprint(fingerprint)
      setCurrentFingerprint(fingerprint)
      setSubmitted(true)
      setSubmittedAt(res.submittedAt)
      setReviewed(false) // entrega nova: o carimbo do professor não vale mais
      if (res.score !== undefined) setScore(res.score)
      if (res.passed !== undefined) setPassed(res.passed)
      setXp(res.gamification?.xpAwarded ?? null)
      setMessage('') // recado é por envio: limpa após mandar
      setMessageSpoken(false)
      // Destrava o "Concluir aula" (gate do backend) → re-render da página.
      player?.refreshAfterStudio?.()
    } catch (err) {
      const apiErr = err as ApiError
      setError(
        apiErr?.code === 'IMPERSONATION_READONLY'
          ? 'Ative o modo de edição no banner para reenviar esta atividade.'
          : apiErr?.code === 'PAYLOAD_TOO_LARGE'
            ? 'Seu projeto está muito grande para enviar.'
            : 'Não foi possível enviar o projeto. Tente de novo.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [lessonId, blockId, player, activity, message, messageSpoken, studioMod, projectId, channel])

  // Abre a confirmação de "Trazer o que eu enviei" (item do menu ⋯ do Estúdio).
  // Estável (o Studio latcha este callback no mount).
  const openSync = useCallback(() => {
    setSyncNote(null)
    setSyncOpen(true)
  }, [])

  // Puxa a entrega do servidor (save na nuvem) e substitui o projeto do editor.
  const doSync = useCallback(async () => {
    setSyncing(true)
    setSyncNote(null)
    try {
      const res = await apiGet<{ project: unknown | null }>(
        `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/studio-submission`,
      )
      if (res?.project) {
        // Re-chaveia o id p/ a chave LOCAL deste bloco/perfil → o autosave grava
        // por cima do rascunho antigo (não volta a defasar no próximo open).
        handleRef.current?.replaceProject({ ...(res.project as Project), id: projectId })
        setSyncOpen(false)
      } else {
        setSyncNote(estudio.semEnvio)
      }
    } catch {
      setSyncNote('Não consegui sincronizar agora. Tente de novo.')
    } finally {
      setSyncing(false)
    }
  }, [lessonId, blockId, projectId, estudio.semEnvio])

  const doRestart = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return
    setRestarting(true)
    setRestartNote(null)
    try {
      // Drena qualquer autosave antigo antes da substituição. A gravação de reposição
      // apaga também partições de blocos/capa que o projeto inicial não possui.
      await handle.save()
      // Data de agora: o recomeço é a versão mais nova, também diante de outro computador.
      const initial: Project = {
        ...(content.initialProject as Project),
        id: projectId,
        updatedAt: Date.now(),
      }
      await replaceLocalProject(initial, { namespace: '' })
      // Uma nova instância também encerra qualquer leitura tardia dos blocos do
      // rascunho antigo, que usa o mesmo id local do projeto inicial.
      setSeed(initial)
      setStudioVersion((version) => version + 1)
      setRestartOpen(false)
      // O recomeço também vai para a conta (sem isso, outro computador traria o antigo).
      subirRef.current()
    } catch {
      setRestartNote('Não consegui recomeçar agora. Seu projeto continua como estava.')
    } finally {
      setRestarting(false)
    }
  }, [content.initialProject, projectId])

  // Troca o rascunho de agora com a "outra versão" guardada neste navegador.
  const doSwap = useCallback(async () => {
    const handle = handleRef.current
    if (!draftDeps || !studioMod) return
    setSwapping(true)
    setOtherNote(null)
    try {
      await handle?.save()
      const aberta = await swapOtherVersion(draftDeps)
      if (!aberta) {
        setHasOther(false)
        setOtherOpen(false)
        return
      }
      await reabrirDoDisco()
      setContaNote(null)
      setOtherOpen(false)
      subirRef.current()
    } catch {
      setOtherNote(rascunho.outraVersaoFalhou)
    } finally {
      setSwapping(false)
    }
  }, [draftDeps, studioMod, reabrirDoDisco, rascunho.outraVersaoFalhou])

  // O Studio LATCHA o adapter uma vez (memoizado por lessonId/blockId), mas `onShared` pode
  // mudar por render — lê via ref pra manter o adapter estável e ainda chamar o handler ATUAL.
  const onSharedRef = useRef(onShared)
  useEffect(() => {
    onSharedRef.current = onShared
  }, [onShared])

  // Título/resumo do post pré-definidos pelo admin (vitrine): preenchem o Compartilhar e
  // ECONOMIZAM IA — com resumo, o dialog NÃO chama a IA (abre com este texto, editável). Vazio
  // (ou no Estúdio Completo, que nem passa isso) → a IA gera o rascunho.
  const presetTitle = content.showcase?.title
  const presetDescription = content.showcase?.summary
  // Capa padrão do curso (admin): fallback do print no dialog + preview. O servidor
  // re-resolve a URL de forma autoritativa ao publicar (não confia no cliente).
  const presetCoverUrl = content.showcase?.defaultCoverUrl

  // Adapter de COMPARTILHAR (Mural) — só no kids (`enableShare`). O Studio o LATCHA
  // uma vez, então memoizamos por (lessonId, blockId): I/O do servidor vive aqui, a
  // UX no editor. ⚠️ SEM `generateDescription`: na AULA o projeto já é conhecido e o
  // admin define o resumo (`presetDescription`) — a criança só ajusta, sem IA. A IA
  // (gerar resumo) vive SÓ no Estúdio Completo (`studio-full-client`), onde o projeto
  // é livre. `publish` sobe o projeto inteiro + print por multipart e devolve os links.
  const share = useMemo<StudioShareAdapter | undefined>(() => {
    if (!enableShare || !lessonId) return undefined
    return {
      presetTitle,
      titleEditable: false,
      presetDescription,
      presetCoverUrl,
      proVerifiedCover: true,
      publication: createStudioPublicationAdapter(),
      async publish({ project, coverDataUrl, useAdminCover, title, description, requestId }) {
        const form = new FormData()
        form.set('lessonId', lessonId)
        form.set('blockId', blockId)
        form.set('description', description)
        form.set('title', title)
        form.set('clientIdempotencyKey', requestId ?? crypto.randomUUID())
        form.set(
          'project',
          new File([JSON.stringify(project)], 'project.json', { type: 'application/json' }),
        )
        if (coverDataUrl) {
          // ⚠️ NÃO usar fetch(data:) — a CSP (connect-src) bloqueia → "Failed to fetch".
          const blob = dataUrlBase64ToBlob(coverDataUrl)
          form.set('cover', new File([blob], 'cover', { type: blob.type || 'image/png' }))
        } else if (useAdminCover) {
          // Sem print/upload: o servidor usa a capa padrão do curso (resolve a URL lá).
          form.set('useDefaultCover', '1')
        }
        const res = await fetch('/api/studio/publish', { method: 'POST', body: form })
        const body = (await res.json().catch(() => null)) as {
          muralUrl?: string
          playUrl?: string
          publicationId?: string
          error?: { message?: string }
        } | null
        if (!res.ok) {
          throw new Error(body?.error?.message ?? 'Não foi possível publicar agora.')
        }
        return {
          muralUrl: body?.muralUrl,
          playUrl: body?.playUrl,
          publicationId: body?.publicationId,
        }
      },
      // Publicou: TRAVA o compartilhar da aula (1 vez só, persistido local) e entrega os
      // links ao host (kids abre a celebração); o ShareDialog fecha sozinho.
      onPublished: (result) => {
        setAlreadyShared(true)
        writeSharedFlag(projectId)
        onSharedRef.current?.(result)
      },
    }
  }, [enableShare, lessonId, blockId, projectId, presetTitle, presetDescription, presetCoverUrl])

  const ready = StudioLesson !== null && seed?.id === projectId && !seedLoadFailed
  const savingDrafts = useLessonDraftEditor(
    channel ? player?.lessonDrafts : undefined,
    lessonId,
    'studio',
    blockId,
    {
      // Editor fora do ar (carregando ou com falha): não há edição na tela para guardar.
      save: async () => {
        if (!ready || !handleRef.current) return
        await handleRef.current.save()
        subirRef.current()
      },
      // Sem envio, o servidor pede o envio; envio sem impressão passa. Senão, o disco decide, e
      // só se ele acabou de ser salvo (com o salvar falhando, a tela pode estar à frente dele).
      matchesSubmission: async ({ saved }) => {
        if (!submitted || !sentFingerprint) return true
        if (!saved || !studioMod) return false
        return (await diskFingerprint(studioMod, projectId)) === sentFingerprint
      },
    },
  )
  const mudouDepoisDoEnvio = Boolean(
    submitted && sentFingerprint && currentFingerprint && sentFingerprint !== currentFingerprint,
  )

  return (
    <div
      // Só o avanço da fase para a edição (a comunidade adulta nunca chega aqui).
      inert={savingDrafts || trazendoDaConta || undefined}
      aria-busy={savingDrafts || trazendoDaConta || undefined}
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-4',
        // Expandido: vira overlay em tela cheia por CSS (cobre a página; navbar = z-40).
        // O cabeçalho com "Reduzir" fica DENTRO do overlay → sempre clicável; menus/
        // diálogos portalados (z-50, depois no DOM) seguem por cima.
        expanded && 'fixed inset-0 z-50 rounded-none',
        // Modo guiada: o card cresce p/ preencher a coluna (pai = flex column com altura).
        fillHeight && !expanded && 'min-h-0 flex-1',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="sz-display text-base">{estudio.titulo}</h3>
          <LessonDraftStatus
            state={draftState}
            onReload={async () => {
              // A página nova traz o Estúdio novo, que lê a versão da conta; o projeto da tela vai
              // ao disco antes (o autosave é debounced).
              // Com prazo: um IndexedDB travado deixava o botão desligado para sempre.
              await Promise.race([
                handleRef.current?.save().catch(() => {}),
                new Promise((resolve) => setTimeout(resolve, 3_000)),
              ])
              window.location.reload()
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LessonVideoToggle expanded={expanded} size="sm" />
          {hasOther ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOtherNote(null)
                setOtherOpen(true)
              }}
              disabled={!ready || swapping}
            >
              <ArrowLeftRight className="size-4" />
              {rascunho.outraVersao}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRestartNote(null)
              setRestartOpen(true)
            }}
            disabled={!ready || restarting}
          >
            <RotateCcw className="size-4" />
            Recomeçar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpanded}
            disabled={!ready}
            // O vídeo flutuante da aula nunca cobre a saída; num editor ele nasce embaixo (a barra de ferramentas mora logo abaixo daqui).
            {...(expanded ? { [EXPANDED_EXIT_ATTR]: EXPANDED_EXIT_EDITOR } : {})}
          >
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            {expanded ? 'Reduzir' : 'Expandir'}
          </Button>
          {content.purpose !== 'experiment' &&
            (!player?.submissionAllowedBlockIds ||
              player.submissionAllowedBlockIds.includes(blockId)) && (
              <Button
                size="sm"
                onClick={() => {
                  setTemplateWarning(
                    submitted &&
                      isInitialTemplateProject(
                        handleRef.current?.getProject(),
                        content.initialProject,
                      ),
                  )
                  setConfirmOpen(true)
                }}
                disabled={submitting || !ready}
              >
                {submitting ? <Spinner /> : <Send className="size-4" />}
                {submitted ? estudio.reenviar : estudio.enviar}
              </Button>
            )}
        </div>
      </div>

      <div
        className={cn(
          // Área generosa p/ programar (a página de aula já é largura total; aqui damos
          // mais ALTURA). `isolate`: PRENDE os z-index internos do Blockly (toolbox/flyout
          // têm z-index alto e VAZAVAM por cima do overlay de modais — ex.: o "Enviar ao
          // professor?"); isolando o container, o overlay de modal (z-50) cobre tudo atrás.
          'isolate overflow-hidden rounded-lg border border-border bg-muted',
          // Expandido: o editor cresce e ocupa todo o pai; normal: altura FIXA. ⚠️ Ela
          // era 44/60rem, de quando o editor pegava a LARGURA inteira da aula. Com as
          // seções, ele mora numa coluna de metade da tela, e 960px de altura ali viram
          // um retângulo estreito e comprido (relato da dona, 09/2026). Quem precisa de
          // mais espaço usa o "Expandir", que é tela cheia. Fixo em `rem` de propósito:
          // `vh` dependia da altura da janela e mudava de notebook para notebook.
          expanded || fillHeight ? 'min-h-0 flex-1' : 'h-[36rem] lg:h-[40rem]',
        )}
      >
        {ready ? (
          // StudioLesson já desliga terminal/IA/profissional/export; aqui o
          // aluno corta também as extensões (editor enxuto na aula).
          <StudioLesson
            key={studioVersion}
            ref={handleRef}
            initialProject={seed as Project}
            level={content.level}
            allowBlocks={content.allowBlocks}
            allowCategories={content.allowCategories}
            allowedModes={content.allowedModes}
            allowLevelReveal={content.allowLevelReveal}
            activity={content.activity}
            features={{ extensions: false, professional: isProLesson, terminal: false }}
            proRuntime={proRuntime}
            share={share}
            // O "Compartilhar" da aula: (1) só habilita DEPOIS de enviar ao professor
            // (publicar exige a entrega; o members também barra com SHOWCASE_NOT_ELIGIBLE);
            // (2) é UMA vez só — depois de publicado, trava (o projeto da aula tem fim; o
            // Estúdio Completo não usa isso e segue ilimitado). Botão VISÍVEL porém
            // desabilitado com a dica em cada caso.
            shareDisabledReason={
              share
                ? !submitted
                  ? estudio.compartilharDepois
                  : alreadyShared
                    ? 'Você já compartilhou este jogo no Mural. 🎉'
                    : undefined
                : undefined
            }
            // Item ⋯ → "Trazer o que eu enviei" (só na aula; abre a confirmação).
            onCloudSync={lessonId ? openSync : undefined}
            persistence={persistence}
            blockUnloadWhenDirty={false}
          />
        ) : seedLoadFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p role="alert" className="text-sm text-muted-foreground">
              {estudio.erroAoAbrir}
            </p>
            <Button variant="outline" onClick={() => setSeedLoadAttempt((attempt) => attempt + 1)}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Carregando o Estúdio...
          </div>
        )}
      </div>

      <SectionProjectCheck blockId={blockId} handleRef={handleRef} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Nota da auto-correção (quando o bloco tem atividade). O feedback POR
          checagem é instantâneo no painel do editor (botão "Verificar"). */}
      {activity && score !== null ? (
        <p className="inline-flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{estudio.pontuacao(score)}</span>
          {passingScore !== undefined ? (
            <span className={passed ? 'text-accent dark:text-primary' : 'text-muted-foreground'}>
              {passed ? estudio.metaAlcancada : estudio.precisaDe(passingScore)}
            </span>
          ) : null}
          {xp ? <span className="text-accent dark:text-primary">· +{xp} XP</span> : null}
        </p>
      ) : null}

      {submitted ? (
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 text-sm text-accent dark:text-primary">
            <CheckCircle2 className="size-4" />
            {estudio.enviado(submittedAt ? new Date(submittedAt).toLocaleString('pt-BR') : null)}
          </p>
          {mudouDepoisDoEnvio ? (
            <p className="sz-lesson-draft-outdated text-sm font-medium">{rascunho.mudouProjeto}</p>
          ) : null}
          {contaNote ? <p className="text-sm text-muted-foreground">{contaNote}</p> : null}
          {/* O professor carimbou "já conferi". Não é nota: é ele dizendo que viu. */}
          {reviewed ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCheck className="size-4" />
              {estudio.conferido}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {passingScore !== undefined
            ? estudio.paraConcluirComMeta
            : player?.submissionAllowedBlockIds &&
                !player.submissionAllowedBlockIds.includes(blockId)
              ? estudio.continueConstruindo
              : estudio.paraConcluir}
        </p>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={submitted ? estudio.confirmarReenviar : estudio.confirmarEnviar}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setConfirmOpen(false)
                void submit()
              }}
              disabled={submitting || voiceBusy}
            >
              <Send className="size-4" />
              {submitted ? 'Reenviar' : 'Enviar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {submitted ? estudio.vaiReceberDeNovo : estudio.vaiReceber} Você pode continuar editando e
          enviar de novo quando quiser.
          {passingScore !== undefined ? estudio.dicaVerificar : ''}
        </p>
        {templateWarning ? (
          <p className="mt-3 text-sm font-medium text-destructive">{estudio.avisoProjetoInicial}</p>
        ) : null}
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="studio-teacher-message" className="font-medium text-sm">
            {estudio.recado} <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Textarea
            id="studio-teacher-message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value.slice(0, MESSAGE_MAX))
              if (!e.target.value.trim()) setMessageSpoken(false)
            }}
            maxLength={MESSAGE_MAX}
            rows={3}
            disabled={submitting}
            placeholder={estudio.recadoExemplo}
          />
          {player?.voiceInput ? (
            <VoiceInputButton
              viewerId={player.viewerId}
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={setMessage}
              onSpoken={() => setMessageSpoken(true)}
              onBusyChange={setVoiceBusy}
              textareaId="studio-teacher-message"
              disabled={submitting}
            />
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        title="Trazer o que você enviou?"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSyncOpen(false)}
              disabled={syncing}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void doSync()} disabled={syncing}>
              {syncing ? <Spinner /> : null}
              Trazer
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">{estudio.trazerExplica}</p>
        {syncNote ? <p className="mt-2 text-sm text-destructive">{syncNote}</p> : null}
      </Dialog>

      <Dialog
        open={otherOpen}
        onClose={() => setOtherOpen(false)}
        title={rascunho.outraVersaoTitulo}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOtherOpen(false)}
              disabled={swapping}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void doSwap()} disabled={swapping}>
              {swapping ? <Spinner /> : <ArrowLeftRight className="size-4" />}
              {rascunho.trazer}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">{rascunho.outraVersaoExplica}</p>
        {otherNote ? <p className="mt-2 text-sm text-destructive">{otherNote}</p> : null}
      </Dialog>

      <Dialog
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        title="Recomeçar do projeto inicial?"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRestartOpen(false)}
              disabled={restarting}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void doRestart()} disabled={restarting}>
              {restarting ? <Spinner /> : <RotateCcw className="size-4" />}
              Recomeçar
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">{estudio.recomecarExplica}</p>
        {restartNote ? <p className="mt-2 text-sm text-destructive">{restartNote}</p> : null}
      </Dialog>
    </div>
  )
}
