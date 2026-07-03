'use client'

// O CSS do Pensa (tokens + @theme que GERA as utilitárias pz-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — mesmo gotcha do
// Estúdio: um JS-import aqui só traria os tokens, sem gerar as utilitárias.
import type { PensaHostAdapter, PensaTransport } from '@sistemazero/pensa'
import type { Project } from '@sistemazero/studio'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PINTA_INTENT_KEY } from './pinta-intent'

// Os packages são client-only (zustand/Blockly/IndexedDB); carregamos DENTRO de um
// effect (igual ao studio-full-client) e o server renderiza só o placeholder.
type PensaModule = typeof import('@sistemazero/pensa')
type StudioModule = typeof import('@sistemazero/studio')

/**
 * Pensa embarcado na comunidade kids (produto vendável). O pacote traz a UI inteira
 * (lista de projetos, mapa da criação, etapas); este host injeta o TRANSPORT
 * (fetch para os shims `/api/pensa/*`), o modo kids, o tema da comunidade e as
 * capacidades do ESTÚDIO da fase R: semeadura (`createStudioProject` — projeto no
 * IndexedDB do MESMO namespace por perfil que o /estudio usa) e o editor embarcado
 * do Modo Missão (`renderStudio`).
 */
export function PensaClient({
  viewerId,
  pintaOwned = false,
}: {
  viewerId: string | null
  /** A criança POSSUI o Pinta (produto à parte)? Sem ele, o botão da missão some. */
  pintaOwned?: boolean
}) {
  const [mod, setMod] = useState<PensaModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  const router = useRouter()
  // O Pensa SEGUE o tema da comunidade (next-themes) — sem toggle próprio.
  const { resolvedTheme } = useTheme()
  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'

  const loadPensa = useCallback(async (isCurrent?: () => boolean) => {
    setMod(null)
    setLoadError(false)
    try {
      const m = await import('@sistemazero/pensa')
      if (isCurrent && !isCurrent()) return
      setMod(m)
    } catch {
      if (isCurrent && !isCurrent()) return
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    void loadPensa(() => active)
    return () => {
      active = false
    }
  }, [loadPensa])

  const transport = useMemo<PensaTransport>(() => createPensaTransport(), [])

  // Semeadura da fase R: cria o projeto no armazenamento LOCAL do Estúdio (namespace
  // do perfil) com o nome do jogo. Id no charset seguro do Studio (sem `:`).
  const createStudioProject = useCallback(
    async (name: string) => {
      const studio = await import('@sistemazero/studio')
      studio.setStudioStorageNamespace(viewerId ?? '')
      const id = `pensa-${crypto.randomUUID().replace(/-/g, '')}`
      const project = studio.createEmptyProject(id, name)
      await studio.createLocalPersistenceAdapter().save(project)
      return id
    },
    [viewerId],
  )

  // Sync OPORTUNISTA do snapshot (fire-and-forget, chamado pelo pacote ao abrir o
  // projeto): local mais novo que o último upload → sobe; local AUSENTE (navegador
  // novo) e snapshot na nuvem → RESTAURA no IndexedDB.
  const syncStudioSnapshot = useCallback(
    ({ pensaProjectId, studioProjectId }: { pensaProjectId: string; studioProjectId: string }) => {
      void (async () => {
        try {
          const studio = await import('@sistemazero/studio')
          studio.setStudioStorageNamespace(viewerId ?? '')
          const adapter = studio.createLocalPersistenceAdapter()
          const local = await adapter.load(studioProjectId)
          if (local) {
            if (local.updatedAt > lastSnapshotUpload(studioProjectId)) {
              await uploadStudioSnapshot(pensaProjectId, local)
            }
            return
          }
          const res = await fetch(`/api/pensa/projects/${pensaProjectId}/studio-snapshot`)
          if (!res.ok) return
          const body = (await res.json().catch(() => null)) as { project?: unknown } | null
          const project = body?.project
          if (project && typeof project === 'object' && !Array.isArray(project)) {
            // Restaura com o id ESPERADO (o snapshot veio deste mesmo projeto Pensa).
            await adapter.save({ ...(project as Project), id: studioProjectId })
          }
        } catch {
          // best-effort: o próximo sync/edição tenta de novo.
        }
      })()
    },
    [viewerId],
  )

  const adapter = useMemo<PensaHostAdapter>(
    () => ({
      transport,
      mode: 'kids',
      projectKind: 'game',
      theme,
      // "Continuar de onde parou": o pacote lembra o projeto aberto por PERFIL.
      stateKey: viewerId ?? undefined,
      // Carinha do Zappy dentro do Pensa (mesmos sprites do resto do app kids).
      mascotImages: {
        happy: '/zappy/happy.webp',
        thinking: '/zappy/thinking.webp',
        celebrating: '/zappy/celebrating.webp',
        sleeping: '/zappy/sleeping.webp',
      },
      createStudioProject,
      // Modo Missão: o editor do Estúdio embarcado no projeto semeado.
      renderStudio: (studioProjectId: string, pensaProjectId: string) => (
        <PensaStudioEmbed
          studioProjectId={studioProjectId}
          pensaProjectId={pensaProjectId}
          viewerId={viewerId}
          theme={theme}
        />
      ),
      // "Abrir o Estúdio" (tela cheia): mesma lista/namespace do produto Estúdio.
      onOpenStudio: () => router.push('/estudio'),
      // "Desenhar no Pinta" na missão aberta — SÓ com a posse do produto (vendido
      // à parte; sem ele o botão some). O intent da missão de arte atravessa por
      // sessionStorage: o pinta-client lê 1x e abre o "Criar novo" pré-configurado.
      ...(pintaOwned
        ? {
            onOpenPinta: (intent?: {
              pensaProjectId: string
              projectName: string
              artKind?: 'sprite' | 'background' | 'tileset'
              palette?: string[]
            }) => {
              if (intent) {
                try {
                  sessionStorage.setItem(
                    PINTA_INTENT_KEY,
                    JSON.stringify({
                      projectRef: {
                        id: intent.pensaProjectId,
                        name: intent.projectName,
                        ...(intent.palette && intent.palette.length > 0
                          ? { palette: intent.palette }
                          : {}),
                      },
                      ...(intent.artKind ? { artKind: intent.artKind } : {}),
                    }),
                  )
                } catch {
                  // sem sessionStorage (modo privado) → abre o Pinta sem pré-preencher.
                }
              }
              router.push('/pinta')
            },
          }
        : {}),
      syncStudioSnapshot,
    }),
    [transport, theme, createStudioProject, syncStudioSnapshot, viewerId, router, pintaOwned],
  )

  return (
    <div className="min-h-[34rem] w-full flex-1 overflow-hidden rounded-2xl border-2 border-border bg-card">
      {loadError ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">Não consegui carregar o Pensa.</p>
            <button
              type="button"
              onClick={() => void loadPensa()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : mod === null ? (
        <div className="grid h-full place-items-center text-muted-foreground text-sm">
          Carregando o Pensa…
        </div>
      ) : (
        <mod.PensaApp adapter={adapter} />
      )}
    </div>
  )
}

// ── Snapshot do jogo na nuvem (backup atrelado ao projeto do Pensa) ──────────

/** Intervalo mínimo entre uploads durante a edição (o autosave local é contínuo). */
const SNAPSHOT_MIN_INTERVAL_MS = 15_000
/** Espelha o cap do members (o gateway corta em 2MB de corpo). */
const SNAPSHOT_MAX_CHARS = 1_800_000
/** Marcador local do último upload OK (evita re-subir snapshot igual no sync). */
const snapshotMarkerKey = (studioProjectId: string) => `sz:pensa:snap:${studioProjectId}`

function lastSnapshotUpload(studioProjectId: string): number {
  try {
    return Number(localStorage.getItem(snapshotMarkerKey(studioProjectId)) ?? 0) || 0
  } catch {
    return 0
  }
}

/** PUT do snapshot (best-effort; nunca loga o conteúdo — é o jogo da criança). */
async function uploadStudioSnapshot(pensaProjectId: string, project: Project): Promise<boolean> {
  try {
    const payload = JSON.stringify(project)
    if (payload.length > SNAPSHOT_MAX_CHARS) return false
    const res = await fetch(`/api/pensa/projects/${pensaProjectId}/studio-snapshot`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: `{"project":${payload}}`,
    })
    if (res.ok) {
      try {
        localStorage.setItem(snapshotMarkerKey(project.id), String(project.updatedAt))
      } catch {
        // sem localStorage (modo privado) → sync futuro re-sobe; inócuo.
      }
    }
    return res.ok
  } catch {
    return false
  }
}

type EmbedState =
  | { status: 'loading' }
  | { status: 'ready'; mod: StudioModule; project: Project }
  | { status: 'error' }

/**
 * Editor do Estúdio embarcado no MODO MISSÃO do Pensa (fase R): carrega o projeto
 * SEMEADO do IndexedDB (namespace do perfil — o MESMO do /estudio, então o jogo
 * também aparece lá) e monta o `<StudioEditor persistence="local">`. Sem `share`
 * (publicar é rito da etapa O, pelo Estúdio) e sem `onExit` (a moldura da missão
 * do Pensa tem o próprio voltar).
 *
 * BACKUP na nuvem: IndexedDB sem o projeto (navegador novo) → RESTAURA do snapshot
 * do projeto do Pensa; durante a edição, o `onChange` do autosave sobe o snapshot
 * espaçado (≥15s) + flush no unmount (navegação SPA mantém o fetch vivo; fechar a
 * aba perde no máximo os últimos segundos — o IndexedDB tem tudo e o próximo sync
 * oportunista re-sobe).
 */
function PensaStudioEmbed({
  studioProjectId,
  pensaProjectId,
  viewerId,
  theme,
}: {
  studioProjectId: string
  pensaProjectId: string
  viewerId: string | null
  theme: 'light' | 'dark'
}) {
  const [state, setState] = useState<EmbedState>({ status: 'loading' })
  const [reloadNonce, setReloadNonce] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadNonce` é só o gatilho do retry — bump força a re-carga sem ser lido no corpo.
  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    void (async () => {
      try {
        const studio = await import('@sistemazero/studio')
        studio.setStudioStorageNamespace(viewerId ?? '')
        const adapter = studio.createLocalPersistenceAdapter()
        let project = await adapter.load(studioProjectId)
        if (!project) {
          // Navegador novo/limpo: restaura do snapshot na nuvem (best-effort).
          try {
            const res = await fetch(`/api/pensa/projects/${pensaProjectId}/studio-snapshot`)
            const body = (await res.json().catch(() => null)) as { project?: unknown } | null
            const remote = body?.project
            if (res.ok && remote && typeof remote === 'object' && !Array.isArray(remote)) {
              const restored = { ...(remote as Project), id: studioProjectId }
              await adapter.save(restored)
              project = restored
            }
          } catch {
            // segue para o estado de erro abaixo.
          }
        }
        if (!active) return
        if (!project) {
          setState({ status: 'error' })
          return
        }
        studio.prefetchStudioModes()
        setState({ status: 'ready', mod: studio, project })
      } catch {
        if (active) setState({ status: 'error' })
      }
    })()
    return () => {
      active = false
    }
  }, [studioProjectId, pensaProjectId, viewerId, reloadNonce])

  // Upload espaçado do snapshot enquanto a criança edita (dirigido pelo onChange
  // do autosave do editor) + flush do pendente no unmount.
  const pendingRef = useRef<Project | null>(null)
  const lastUploadRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSnapshot = useCallback(
    (project: Project) => {
      pendingRef.current = project
      if (timerRef.current) return
      const wait = Math.max(0, SNAPSHOT_MIN_INTERVAL_MS - (Date.now() - lastUploadRef.current))
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        const pending = pendingRef.current
        pendingRef.current = null
        if (!pending) return
        lastUploadRef.current = Date.now()
        void uploadStudioSnapshot(pensaProjectId, pending)
      }, wait)
    },
    [pensaProjectId],
  )

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
      const pending = pendingRef.current
      pendingRef.current = null
      if (pending) void uploadStudioSnapshot(pensaProjectId, pending)
    },
    [pensaProjectId],
  )

  if (state.status === 'loading') {
    return (
      <div className="grid h-full min-h-[24rem] place-items-center text-muted-foreground text-sm">
        Carregando o Estúdio…
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="grid h-full min-h-[24rem] place-items-center p-6 text-center">
        <div className="flex max-w-sm flex-col items-center gap-3">
          <p className="font-semibold">Não consegui abrir seu jogo aqui.</p>
          <p className="text-muted-foreground text-sm">
            Ele pode ter sido apagado no Estúdio. Tenta de novo?
          </p>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
          >
            <RefreshCw className="size-4" /> Tentar de novo
          </button>
        </div>
      </div>
    )
  }
  const { mod: studio, project } = state
  return (
    <studio.StudioEditor
      initialProject={project}
      persistence="local"
      theme={theme}
      onChange={scheduleSnapshot}
    />
  )
}

/**
 * Transport do host: prefixa `/api/pensa` (shims → member-shell → gateway → members).
 * Erros HTTP viram Error com `status`/`code` (shape do `PensaApiError` do pacote —
 * duck-typed p/ não depender da CLASSE atravessar o dynamic import).
 */
function createPensaTransport(): PensaTransport {
  return {
    async request<T>(
      path: string,
      init?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT'; body?: unknown },
    ): Promise<T> {
      const res = await fetch(`/api/pensa${path}`, {
        method: init?.method ?? 'GET',
        headers: init?.body !== undefined ? { 'content-type': 'application/json' } : undefined,
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      })
      const body = (await res.json().catch(() => null)) as {
        error?: { code?: string; message?: string }
      } | null
      if (!res.ok) {
        const err = new Error(body?.error?.message ?? 'Não deu certo agora.') as Error & {
          status: number
          code: string
        }
        err.status = res.status
        err.code = body?.error?.code ?? 'REQUEST_FAILED'
        throw err
      }
      return body as T
    },
    // Chat da etapa Z: POST SSE em /api/pensa/chat. Eventos (`data` é JSON):
    // delta (texto) · state (5 perguntas) · done · error; `: ping` é ignorado.
    // Devolve a fn de ABORT (abortar = o BFF não persiste o turno).
    streamChat(input, handlers) {
      const controller = new AbortController()
      void (async () => {
        let finished = false
        const fail = (message: string, status = 0, code = 'PENSA_AI_UNAVAILABLE') => {
          if (finished) return
          finished = true
          const err = new Error(message) as Error & { status: number; code: string }
          err.status = status
          err.code = code
          handlers.onError(err)
        }
        try {
          const res = await fetch('/api/pensa/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(input),
            signal: controller.signal,
          })
          if (!res.ok || !res.body) {
            const body = (await res.json().catch(() => null)) as {
              error?: { code?: string; message?: string }
            } | null
            fail(
              body?.error?.message ?? 'O Zappy tropeçou aqui. Tente de novo.',
              res.status,
              body?.error?.code ?? 'PENSA_AI_UNAVAILABLE',
            )
            return
          }
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const blocks = buffer.split('\n\n')
            buffer = blocks.pop() ?? ''
            for (const block of blocks) {
              let event = ''
              let data = ''
              for (const line of block.split('\n')) {
                if (line.startsWith('event:')) event = line.slice(6).trim()
                else if (line.startsWith('data:')) data = line.slice(5).trim()
                // Linhas `: ping` (comentário) caem fora sozinhas.
              }
              if (!event || !data) continue
              let parsedData: unknown
              try {
                parsedData = JSON.parse(data)
              } catch {
                continue
              }
              if (event === 'delta' && typeof parsedData === 'string') {
                handlers.onDelta(parsedData)
              } else if (event === 'state') {
                handlers.onState?.(parsedData as Record<string, unknown>)
              } else if (event === 'done') {
                finished = true
                handlers.onDone()
                await reader.cancel().catch(() => undefined)
                return
              } else if (event === 'error') {
                const e = parsedData as { code?: string; message?: string }
                fail(
                  e.message ?? 'O Zappy tropeçou aqui. Tente de novo.',
                  502,
                  e.code ?? 'PENSA_AI_UNAVAILABLE',
                )
                await reader.cancel().catch(() => undefined)
                return
              }
            }
          }
          // Stream fechou sem `done` nem `error` = conexão caiu no meio (o BFF só
          // persiste o turno no done — a criança reenvia).
          fail('A conexão caiu no meio. Tente de novo.')
        } catch {
          if (!controller.signal.aborted) {
            fail('A conexão falhou. Tente de novo.')
          }
        }
      })()
      return () => controller.abort()
    },
  }
}
