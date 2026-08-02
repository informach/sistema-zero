'use client'

// O CSS do Estúdio (tokens + @theme que GERA as utilitárias sz-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — um JS-import aqui só
// traz os tokens, NÃO registra as cores p/ gerar as utilitárias (sem isso os modais e
// menus do editor saem sem fundo/cor). Ver o comentário no globals.css.
import { dataUrlBase64ToBlob } from '@sistemazero/member-shell/lib/data-url'
import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import { createStudioZappyAdapter } from '@sistemazero/member-shell/lib/studio-zappy-adapter'
import { useIsDesktop } from '@sistemazero/member-shell/lib/use-is-desktop'
import type { Project, StudioShareAdapter, StudioTutorConfig } from '@sistemazero/studio'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { openStudioZappyLesson } from '../../lib/studio-zappy-navigation'

// O package do Estúdio é pesado (Monaco/Blockly/IndexedDB) e NÃO roda no SSR — por
// isso carregamos o módulo inteiro DENTRO de um effect (igual ao public-player) e o
// server renderiza só o placeholder. `mod` guarda os exports carregados.
type StudioModule = typeof import('@sistemazero/studio')
type View = { name: 'list' } | { name: 'editor'; projectId: string }
type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; project: Project }
  | { status: 'not-found' }

/**
 * Estúdio Completo embarcado na comunidade kids (produto vendável). Hospeda a navegação
 * lista ⇄ editor (o package não tem router — quem roteia é o host; aqui é estado local)
 * com persistência LOCAL (IndexedDB do navegador, a experiência do playground). Recursos
 * CLÁSSICOS: o `<StudioEditor>` já vem com terminal/IA/profissional OFF por default —
 * por isso NÃO passamos `features` (sem WebContainer = sem necessidade de COOP/COEP). O
 * botão "Compartilhar" publica no Mural via o caminho standalone (sem aula).
 */
export function StudioFullClient({
  viewerId,
  challenge = null,
  tier,
  showExamples = false,
  zappyEnabled = false,
}: {
  viewerId: string | null
  /**
   * DESAFIO do mês (game jam) — presente SÓ quando a criança possui Clube +
   * Estúdio (a página checa as refs): liga o checkbox "Participar do Desafio"
   * no Compartilhar. O gate REAL da tag é o do hub no publish.
   */
  challenge?: { key: string; title: string } | null
  /** Modos + perfil de blocos derivados do RANK do aluno (ver `resolveStudioTier`). */
  tier: StudioTier
  /**
   * Mostrar os EXEMPLOS prontos — a vitrine "Que jogo você quer criar?" na lista
   * E os "Exemplos clássicos" no painel de Extensões. Ligado SÓ p/ a equipe
   * interna enquanto o catálogo é validado (a página deriva de `session.role`);
   * o cliente segue sem exemplos. Default `false`.
   */
  showExamples?: boolean
  /** Capacidade de oferta derivada no servidor; o BFF mantém o gate autoritativo. */
  zappyEnabled?: boolean
}) {
  const [mod, setMod] = useState<StudioModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState<View>({ name: 'list' })
  // O Estúdio SEGUE o tema da comunidade (next-themes) — sem toggle próprio e sem
  // destoar do app ao redor. `resolvedTheme` é undefined no 1º render → cai em claro.
  const { resolvedTheme } = useTheme()
  const studioTheme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
  // Só a Lenda/admin (tier.pro) E no desktop pode criar projetos PRO (modo Código):
  // o WebContainer não roda no celular/tablet, então nem oferecemos a escolha lá. É
  // um PRÉ-FILTRO; o gate real é a capacidade (`canRunProMode`) na rota /estudio/pro.
  const isDesktop = useIsDesktop()
  const proAvailable = tier.pro && isDesktop

  const loadStudio = useCallback(
    async (isCurrent?: () => boolean) => {
      setMod(null)
      setLoadError(false)
      try {
        const m = await import('@sistemazero/studio')
        if (isCurrent && !isCurrent()) return
        // Isola o armazenamento LOCAL por PERFIL (kids): irmãos no mesmo navegador NÃO compartilham
        // a lista de projetos. ANTES de renderizar a ProjectList. Vazio (sem sessão) = store padrão.
        m.setStudioStorageNamespace(viewerId ?? '')
        setMod(m)
        // Aquece os chunks pesados (Blockly/Monaco) enquanto a criança olha a lista.
        m.prefetchStudioModes()
      } catch {
        if (isCurrent && !isCurrent()) return
        setLoadError(true)
      }
    },
    [viewerId],
  )

  useEffect(() => {
    let active = true
    void loadStudio(() => active)
    return () => {
      active = false
    }
  }, [loadStudio])

  // Adapter de COMPARTILHAR (Mural) — standalone (SEM aula): `describe` rascunha a
  // descrição via IA no servidor (fail-soft) e `publish` sobe projeto + capa por
  // multipart à rota standalone, que devolve os links. Memoizado (o Studio o latcha).
  const share = useMemo<StudioShareAdapter>(
    () => ({
      // Desafio do mês: liga o checkbox no ShareDialog (posse checada na página).
      ...(challenge ? { challenge } : {}),
      async generateDescription({ project, title }) {
        try {
          const res = await fetch('/api/studio/describe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              files: {
                html: project.files['index.html'],
                css: project.files['style.css'],
                js: project.files['script.js'],
              },
              title,
            }),
          })
          if (!res.ok) return ''
          const body = (await res.json()) as { description?: string; quotaExceeded?: boolean }
          // Teto de IA da conta atingido → o ShareDialog esconde o "Gerar" e cai
          // no modo manual (o throw com code é duck-typed lá).
          if (body.quotaExceeded) {
            throw Object.assign(new Error('quota de IA esgotada'), {
              code: 'AI_QUOTA_EXCEEDED' as const,
            })
          }
          return body.description ?? ''
        } catch (error) {
          if ((error as { code?: string })?.code === 'AI_QUOTA_EXCEEDED') throw error
          return '' // fail-soft: a criança escreve do zero
        }
      },
      async publish({ project, coverDataUrl, title, description, challengeKey }) {
        const form = new FormData()
        form.set('title', title)
        form.set('description', description)
        form.set('clientIdempotencyKey', crypto.randomUUID())
        // Tag do desafio (checkbox marcado) — o hub valida posse+mês (drop silencioso).
        if (challengeKey) form.set('challengeKey', challengeKey)
        form.set(
          'project',
          new File([JSON.stringify(project)], 'project.json', { type: 'application/json' }),
        )
        if (coverDataUrl) {
          // ⚠️ NÃO usar fetch(data:) — a CSP (connect-src) bloqueia → "Failed to fetch".
          const blob = dataUrlBase64ToBlob(coverDataUrl)
          form.set('cover', new File([blob], 'cover', { type: blob.type || 'image/png' }))
        }
        const res = await fetch('/api/studio/publish-standalone', { method: 'POST', body: form })
        const body = (await res.json().catch(() => null)) as {
          muralUrl?: string
          playUrl?: string
          error?: { message?: string }
        } | null
        if (!res.ok) {
          throw new Error(body?.error?.message ?? 'Não foi possível publicar agora.')
        }
        return { muralUrl: body?.muralUrl, playUrl: body?.playUrl }
      },
    }),
    [challenge],
  )
  const tutor = useMemo<StudioTutorConfig | undefined>(
    () =>
      zappyEnabled
        ? {
            adapter: createStudioZappyAdapter(),
            openLesson: openStudioZappyLesson,
            cooldownMs: 1_500,
          }
        : undefined,
    [zappyEnabled],
  )

  const openProject = useCallback((projectId: string) => setView({ name: 'editor', projectId }), [])
  const backToList = useCallback(() => setView({ name: 'list' }), [])

  // O editor PREENCHE o espaço disponível: `flex-1` dentro do <main> do MainContainer
  // (no /estudio o main é `flex flex-col` de largura+altura totais). `min-h-[34rem]`
  // mantém a usabilidade em telas baixas (a página rola se não couber).
  return (
    <div className="min-h-[34rem] w-full flex-1 overflow-hidden rounded-2xl border-2 border-border bg-card">
      {loadError ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">Não consegui carregar o Estúdio.</p>
            <button
              type="button"
              onClick={() => void loadStudio()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : mod === null ? (
        <div className="grid h-full place-items-center text-muted-foreground text-sm">
          Carregando o Estúdio…
        </div>
      ) : view.name === 'list' ? (
        <mod.ProjectList
          onOpenProject={openProject}
          theme={studioTheme}
          professional={proAvailable}
          initialExtensions={tier.initialExtensions}
          allowedExtensions={tier.allowedExtensions}
          showExamples={showExamples}
        />
      ) : (
        <EditorScreen
          mod={mod}
          projectId={view.projectId}
          onExit={backToList}
          share={share}
          tutor={tutor}
          theme={studioTheme}
          tier={tier}
          showExamples={showExamples}
          professional={proAvailable && tier.canPromoteToPro}
        />
      )}
    </div>
  )
}

/** Carrega o projeto do IndexedDB e monta o editor completo (volta à lista no "Projetos"). */
function EditorScreen({
  mod,
  projectId,
  onExit,
  share,
  tutor,
  theme,
  tier,
  showExamples,
  professional,
}: {
  mod: StudioModule
  projectId: string
  onExit: () => void
  share: StudioShareAdapter
  tutor: StudioTutorConfig | undefined
  theme: 'light' | 'dark'
  tier: StudioTier
  showExamples: boolean
  professional: boolean
}) {
  const adapter = useMemo(() => mod.createLocalPersistenceAdapter(), [mod])
  const [state, setState] = useState<EditorState>({ status: 'loading' })
  const router = useRouter()
  // Guard "1×/sessão" do beacon de "criou hoje" (o dedupe REAL do dia é do members).
  const activityBeaconedRef = useRef(false)

  // A criança CRIOU/editou no Estúdio hoje → XP diário que SEGURA o foguinho de quem já
  // terminou os cursos (1×/dia, gated por posse no members). Dispara UMA vez por sessão
  // do editor, só numa edição REAL (autosave — NÃO em abrir/`onReady` nem no `flush` de
  // fechamento). Best-effort/fire-and-forget; no sucesso re-sincroniza o chrome
  // (foguinho/XP/ranking) sem a criança precisar recarregar.
  const handleActivity = useCallback(
    (_project: Project, ctx?: { reason: 'autosave' | 'flush' }) => {
      if (ctx?.reason !== 'autosave' || activityBeaconedRef.current) return
      activityBeaconedRef.current = true
      fetch('/api/studio/activity', { method: 'POST' })
        .then((res) => {
          if (res.ok) router.refresh()
        })
        .catch(() => {})
    },
    [router],
  )
  const handlePromoteToPro = useCallback((project: Project) => {
    window.location.assign(`/estudio/pro/${encodeURIComponent(project.id)}`)
  }, [])

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    adapter
      .load(projectId)
      .then((project) => {
        if (!active) return
        setState(project ? { status: 'ready', project } : { status: 'not-found' })
      })
      .catch(() => {
        if (active) setState({ status: 'not-found' })
      })
    return () => {
      active = false
    }
  }, [adapter, projectId])

  // Projeto sumiu (apagado noutra aba) → volta à lista sem travar.
  useEffect(() => {
    if (state.status !== 'not-found') return
    const timer = setTimeout(onExit, 1200)
    return () => clearTimeout(timer)
  }, [state.status, onExit])

  // Projeto PRO (modo Código) abre na rota ISOLADA `/estudio/pro/[id]` — a ÚNICA
  // com COOP/COEP (o WebContainer precisa do cross-origin isolation). ⚠️ Precisa ser
  // navegação com CARGA COMPLETA (`window.location`), NÃO `router.push`: os headers
  // COEP só são aplicados numa requisição HTTP nova do documento; um soft-nav do Next
  // manteria o documento atual (/estudio, SEM COEP) → `crossOriginIsolated` false →
  // o WebContainer se recusaria a bootar ("modo Código pede um computador").
  useEffect(() => {
    if (state.status === 'ready' && state.project.kind === 'pro') {
      window.location.assign(`/estudio/pro/${state.project.id}`)
    }
  }, [state])

  if (state.status === 'loading') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Carregando projeto…
      </div>
    )
  }
  if (state.status === 'not-found') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Projeto não encontrado. Voltando à lista…
      </div>
    )
  }
  // Projeto PRO: o effect acima já está roteando p/ /estudio/pro — não monta o
  // editor clássico (ele nem mostraria o modo Código num projeto pro).
  if (state.project.kind === 'pro') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Abrindo o modo Código…
      </div>
    )
  }
  return (
    <mod.StudioEditor
      initialProject={state.project}
      persistence="local"
      onExit={onExit}
      onChange={handleActivity}
      share={share}
      tutor={tutor}
      theme={theme}
      // Modos + degrau de blocos pelo RANK do aluno (carreira de 8, Faísca→Lenda;
      // admin=Lenda): cada nível libera o degrau que vai estudar em seguida; a
      // Ponte abre no Mestre dos Jogos e o PRO somente na Lenda (ver
      // member-shell/lib/studio-tier.ts). Sem "Mostrar blocos avançados" — o rank
      // é o portão estrito.
      level={tier.level}
      allowBlocks={tier.allowBlocks}
      allowExtensions={tier.allowedExtensions}
      allowedModes={tier.allowedModes}
      allowLevelReveal={tier.allowLevelReveal}
      features={{ professional }}
      onPromoteToPro={handlePromoteToPro}
      // Exemplos "clássicos" no painel de Extensões — só p/ a equipe (ver a página).
      showExamples={showExamples}
    />
  )
}
