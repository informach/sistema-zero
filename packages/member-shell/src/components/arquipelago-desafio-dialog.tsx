'use client'

import {
  type DesafioAberto,
  LIMITES_DO_DESAFIO,
  ResultadoDaVerificacaoSchema,
} from '@sistemazero/arquipelago-contracts'
import { awaitWithSignal } from '@sistemazero/core/http'
import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import type { EditableStudioProject as Project, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { ArrowLeft, ChevronDown, Flag, Lightbulb, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { sessionFetch } from '../lib/session-fetch'
import { resolveStudioLessonSeed } from '../lib/studio-lesson-seed'
import { type EstadoDoObjetivo, ObjectiveList } from './studio/objective-list'

type StudioModule = typeof import('@sistemazero/studio')

/** O que a tela diz (igual no Kids e no adulto; as regras de texto do jogo valem aqui). */
export const TEXTOS_DO_DESAFIO = {
  subtitulo: 'Desafio do Arquipélago',
  voltar: 'Voltar ao jogo',
  concluir: 'Concluir',
  oDesafio: 'O desafio',
  dicas: 'Dicas',
  extra: 'Desafio extra',
  extraNota: 'Não precisa para concluir.',
  objetivos: 'Objetivos',
  progresso: (cumpridos: number, total: number) => `${cumpridos} de ${total} cumpridos`,
  conferir: 'Conferir',
  conferindo: 'Conferindo o projeto',
  testando: 'Testando o seu jogo. Isso leva alguns segundos.',
  cumprido: 'Desafio cumprido. Toque em Concluir para ver no jogo o que mudou.',
  cumpridoComExtra:
    'Desafio cumprido. Ainda tem o desafio extra, se você quiser. Toque em Concluir quando terminar.',
  faltou: 'Ainda falta um objetivo. Veja a lista e tente de novo.',
  mudou: 'Você mexeu no projeto depois de conferir. Confira de novo.',
  abrindo: 'Abrindo o Estúdio',
  naoAbriu: 'O Estúdio não abriu agora. Volte ao jogo e tente de novo.',
  desafioMudou: 'Este desafio mudou. Volte ao jogo e abra o quadro de novo.',
  grandeDemais:
    'Seu projeto ficou grande demais para conferir. Tire algumas imagens ou sons e tente de novo.',
  ocupado: 'Muita gente conferindo agora. Espere um pouco e tente de novo.',
  erro: 'Não deu para conferir agora. Seu projeto continua aqui. Tente de novo.',
  semAcesso: 'O desafio fechou por agora. Volte ao jogo.',
  sessaoMudou: 'Outra pessoa entrou neste aparelho. Abra o jogo de novo.',
  naoGuardou: 'Não consegui guardar o seu projeto neste aparelho. Tente de novo.',
  sairSemGuardar: 'Sair sem guardar',
  tentarDeNovo: 'Tentar de novo',
} as const

/** Quanto esperar o rascunho ser guardado ao sair (o mesmo prazo do flush do Estúdio). */
const ESPERA_PARA_GUARDAR_MS = 5_000
/** Quantas revisões para trás o rascunho é procurado quando a equipe publica de novo. */
const REVISOES_PARA_TRAS = 10

/**
 * Id do rascunho local do desafio: por desafio, revisão e perfil (irmãos no mesmo navegador não
 * dividem o trabalho). Só caracteres que o Estúdio aceita no id (`[A-Za-z0-9_-]`).
 */
export function idDoRascunhoDoDesafio(desafioId: string, revisao: number, viewerId: string) {
  return `arquipelago-desafio-${desafioId}-${revisao}-${viewerId}`
}

/**
 * A equipe publicou de novo: o rascunho de uma revisão anterior vem junto, com o id da atual, se
 * ainda combina com o projeto inicial novo (mesmo modo e mesma linguagem). Senão, começa do novo.
 */
export async function rascunhoDeRevisaoAnterior(
  ler: (id: string) => Promise<Project | null>,
  desafio: { id: string; revisao: number },
  viewerId: string,
  inicial: Project,
): Promise<Project | null> {
  const ate = Math.max(1, desafio.revisao - REVISOES_PARA_TRAS)
  for (let revisao = desafio.revisao - 1; revisao >= ate; revisao--) {
    const antigo = await ler(idDoRascunhoDoDesafio(desafio.id, revisao, viewerId))
    if (antigo && studioProjectContinuityIssue(antigo, inicial) === null)
      return { ...antigo, id: inicial.id }
  }
  return null
}

/** A frase de uma conferência que não voltou (status e código do serviço do jogo). */
export function fraseDoErroDaConferencia(status: number, codigo: string | undefined): string {
  if (codigo === 'DESAFIO_MUDOU' || codigo === 'DESAFIO_NAO_ENCONTRADO')
    return TEXTOS_DO_DESAFIO.desafioMudou
  if (codigo === 'SESSION_CHANGED' || status === 401) return TEXTOS_DO_DESAFIO.sessaoMudou
  // Tempo do dia acabou, desafios desligados ou o desafio fechou: tentar de novo não adianta.
  if (status === 403) return TEXTOS_DO_DESAFIO.semAcesso
  if (status === 413 || codigo === 'PROJETO_RECUSADO' || codigo === 'PAYLOAD_TOO_LARGE')
    return TEXTOS_DO_DESAFIO.grandeDemais
  if (status === 429) return TEXTOS_DO_DESAFIO.ocupado
  return TEXTOS_DO_DESAFIO.erro
}

type Resultados = ReadonlyArray<{ id: string; passou: boolean }>

/**
 * O Estúdio de desafio por cima do jogo (Quadro das Cores e os outros desafios). O desafio vem
 * do serviço (`GET /desafios/:id`, sem gabarito nem regra); o rascunho fica neste navegador; quem
 * confere é o serviço (`POST /desafios/:id/verificar`), que guarda o resultado e dá o prêmio.
 * `onFinish(true)` quando a conferência passou nesta tela; `false` quando a pessoa só fechou.
 */
export function ArquipelagoDesafioDialog({
  desafio,
  viewerId,
  onFinish,
}: {
  desafio: DesafioAberto
  viewerId: string
  onFinish: (cumprido: boolean) => void
}) {
  const camada = useRef<HTMLDivElement>(null)
  const handleRef = useRef<StudioHandle | null>(null)
  const tituloId = useId()
  const objetivosId = useId()
  const projectId = idDoRascunhoDoDesafio(desafio.id, desafio.revisao, viewerId)
  // O editor das aulas (sem projetos, terminal, IA nem exportar): o desafio é como uma parte de
  // aula. Carregado só aqui (Monaco, Blockly e IndexedDB não existem no servidor).
  const [aberto, setAberto] = useState<{ studio: StudioModule; semente: Project } | null>(null)
  const [naoAbriu, setNaoAbriu] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [naoGuardou, setNaoGuardou] = useState(false)
  const [resultados, setResultados] = useState<Resultados>(desafio.ultimosResultados)
  const [ocupado, setOcupado] = useState(false)
  const [cumprido, setCumprido] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [desatualizado, setDesatualizado] = useState(false)
  const [aviso, setAviso] = useState<{ texto: string; tom: 'ok' | 'falta' | 'erro' } | null>(null)
  const [verObjetivos, setVerObjetivos] = useState(false)
  const conferencia = useRef<AbortController | null>(null)
  const saindoRef = useRef(false)
  // O instante do projeto que o resultado mostrado descreve. O guardado é de antes desta tela: a
  // primeira edição depois de abrir já o deixa "de antes da mudança" (como nas aulas).
  const conferidoEm = useRef(Date.now())

  // O foco entra na camada e, ao fechar, volta para onde estava (o host cuida de quando sumiu).
  useEffect(() => {
    const anterior = document.activeElement
    camada.current?.focus({ preventScroll: true })
    return () => {
      if (anterior instanceof HTMLElement && anterior.isConnected)
        anterior.focus({ preventScroll: true })
    }
  }, [])

  // O rascunho deste navegador (ou o de uma revisão anterior), ou o projeto inicial. Ler o
  // rascunho que falha NÃO abre o inicial por cima: guardar apagaria o trabalho que está lá.
  useEffect(() => {
    if (tentativa < 0) return
    let vivo = true
    setNaoAbriu(false)
    void (async () => {
      const studio = await import('@sistemazero/studio')
      const local = studio.createLocalPersistenceAdapter()
      const inicial = { ...(desafio.projetoInicial as Project), id: projectId }
      const projeto = await resolveStudioLessonSeed({
        local: () => local.load(projectId),
        carryover: () =>
          rascunhoDeRevisaoAnterior((id) => local.load(id), desafio, viewerId, inicial),
        initial: inicial,
      })
      if (vivo) setAberto({ studio, semente: projeto })
    })().catch(() => {
      if (vivo) setNaoAbriu(true)
    })
    return () => {
      vivo = false
    }
  }, [desafio, projectId, viewerId, tentativa])

  useEffect(
    () => () => {
      conferencia.current?.abort()
    },
    [],
  )

  const obrigatorios = desafio.objetivos.filter((o) => !o.optional)
  const extras = desafio.objetivos.filter((o) => o.optional)
  const estadoDe = (id: string): EstadoDoObjetivo => {
    const r = resultados.find((item) => item.id === id)
    return r ? (r.passou ? 'passed' : 'failed') : 'unchecked'
  }
  const feitos = obrigatorios.filter((o) => estadoDe(o.id) === 'passed').length
  const rodaOJogo = desafio.objetivos.some(
    (o) => o.kind === 'game' || o.kind === 'function' || o.kind === 'script',
  )

  async function conferir() {
    const handle = handleRef.current
    if (!handle || conferencia.current || saindoRef.current) return
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(170_000)])
    conferencia.current = controller
    setOcupado(true)
    setAviso(null)
    try {
      // Espera o editor terminar de ler o código digitado (a ponte dos blocos), como nas aulas.
      let projeto = handle.getProject()
      for (let i = 0; projeto?.bridgeCodeAhead && i < 15; i++) {
        await awaitWithSignal(() => new Promise<void>((r) => setTimeout(r, 200)), signal)
        projeto = handle.getProject()
      }
      await awaitWithSignal(() => handle.save(), signal)
      projeto = handle.getProject()
      if (!projeto) return
      const enviado = JSON.stringify(projeto)
      const instante = projeto.updatedAt ?? Date.now()
      // O mesmo teto do contrato: acima dele o serviço recusa sem dizer o porquê.
      if (enviado.length > LIMITES_DO_DESAFIO.projetoCaracteres) {
        setAviso({ texto: TEXTOS_DO_DESAFIO.grandeDemais, tom: 'erro' })
        return
      }
      const resposta = await sessionFetch(
        `/api/arquipelago/desafios/${encodeURIComponent(desafio.id)}/verificar`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: `{"revisao":${desafio.revisao},"projeto":${enviado}}`,
          signal,
        },
      )
      const corpo: unknown = await resposta.json().catch(() => null)
      if (!resposta.ok) {
        const codigo = (corpo as { error?: { code?: unknown } } | null)?.error?.code
        setAviso({
          texto: fraseDoErroDaConferencia(
            resposta.status,
            typeof codigo === 'string' ? codigo : undefined,
          ),
          tom: 'erro',
        })
        return
      }
      const lido = ResultadoDaVerificacaoSchema.safeParse(corpo)
      if (!lido.success) {
        setAviso({ texto: TEXTOS_DO_DESAFIO.erro, tom: 'erro' })
        return
      }
      setResultados(lido.data.resultados)
      conferidoEm.current = instante
      setDesatualizado(JSON.stringify(handleRef.current?.getProject()) !== enviado)
      if (lido.data.passou) {
        setCumprido(true)
        const extraFaltando = extras.some(
          (o) => !lido.data.resultados.find((r) => r.id === o.id)?.passou,
        )
        setAviso({
          texto: extraFaltando ? TEXTOS_DO_DESAFIO.cumpridoComExtra : TEXTOS_DO_DESAFIO.cumprido,
          tom: 'ok',
        })
      } else {
        setVerObjetivos(true)
        setAviso({ texto: TEXTOS_DO_DESAFIO.faltou, tom: 'falta' })
      }
    } catch {
      if (!controller.signal.aborted) setAviso({ texto: TEXTOS_DO_DESAFIO.erro, tom: 'erro' })
    } finally {
      if (conferencia.current === controller) conferencia.current = null
      setOcupado(false)
    }
  }

  /**
   * Guarda o rascunho e volta ao jogo. Guardar tem prazo: se falhar ou demorar, a criança fica
   * aqui com o aviso e pode tentar de novo ou sair sem guardar (como o diálogo das ferramentas).
   */
  async function sair(semGuardar = false) {
    if (saindoRef.current) return
    saindoRef.current = true
    setSaindo(true)
    conferencia.current?.abort()
    const handle = handleRef.current
    if (!semGuardar && handle) {
      try {
        await awaitWithSignal(() => handle.save(), AbortSignal.timeout(ESPERA_PARA_GUARDAR_MS))
      } catch {
        saindoRef.current = false
        setSaindo(false)
        setNaoGuardou(true)
        setAviso({ texto: TEXTOS_DO_DESAFIO.naoGuardou, tom: 'erro' })
        return
      }
    }
    onFinish(cumprido)
  }

  return (
    // Uma camada comum, não um `<dialog>` modal: os menus dos blocos (campos de número, texto e
    // listas) e os do Estúdio vivem no `body`, e o modal nativo os deixaria por baixo e inertes.
    // O host deixa o jogo inerte enquanto isso.
    <div
      ref={camada}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      tabIndex={-1}
      onKeyDown={(event) => {
        // As teclas digitadas no editor não chegam ao jogo pausado atrás (ele escuta a janela).
        // Só o apertar: o soltar segue, para o jogo não ficar com uma tecla presa.
        event.stopPropagation()
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault()
          void sair()
        }
      }}
      className="fixed inset-0 h-dvh w-screen overflow-hidden bg-background text-foreground outline-none"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-2 border-border border-b bg-card px-3 py-2.5 sm:gap-3 sm:px-4">
          <Button
            variant="outline"
            disabled={saindo}
            onClick={() => void sair()}
            aria-label={TEXTOS_DO_DESAFIO.voltar}
            className="h-11 shrink-0 gap-2 rounded-full px-3 font-semibold text-sm sm:px-4"
          >
            <ArrowLeft aria-hidden className="size-4" />
            <span className="hidden sm:inline">{TEXTOS_DO_DESAFIO.voltar}</span>
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              aria-hidden
              className="hidden size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary min-[420px]:grid"
            >
              <Flag className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 id={tituloId} className="sz-display truncate text-lg leading-tight">
                {desafio.titulo}
              </h2>
              <p className="truncate text-muted-foreground text-xs">
                {TEXTOS_DO_DESAFIO.subtitulo}
              </p>
            </div>
          </div>
          {cumprido ? (
            <button
              type="button"
              disabled={saindo}
              onClick={() => void sair()}
              className="sz-btn-gradient h-11 shrink-0 gap-2 px-4 text-sm sm:px-5"
            >
              {saindo ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              {TEXTOS_DO_DESAFIO.concluir}
            </button>
          ) : null}
        </header>
        <details
          className="group shrink-0 border-border border-b bg-card px-3 py-2 sm:px-4"
          open={desafio.enunciado.length <= 280}
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-sm">
            <ChevronDown aria-hidden className="size-4 shrink-0 group-open:rotate-180" />
            {TEXTOS_DO_DESAFIO.oDesafio}
          </summary>
          <div className="max-h-[30dvh] space-y-3 overflow-y-auto overscroll-contain pb-2 text-sm">
            <p className="whitespace-pre-line">{desafio.enunciado}</p>
            {desafio.dicas.length > 0 ? (
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  <Lightbulb aria-hidden className="size-4 text-primary" />
                  {TEXTOS_DO_DESAFIO.dicas}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-6 text-muted-foreground">
                  {desafio.dicas.map((dica) => (
                    <li key={dica}>{dica}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {desafio.desafioExtra ? (
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  <Sparkles aria-hidden className="size-4 text-primary" />
                  {desafio.desafioExtra.titulo}
                </p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">
                  {desafio.desafioExtra.texto}
                </p>
              </div>
            ) : null}
          </div>
        </details>
        <div className="isolate min-h-0 flex-1 overflow-hidden bg-muted" inert={saindo}>
          {aberto ? (
            <aberto.studio.StudioLesson
              ref={handleRef}
              initialProject={aberto.semente}
              features={{ extensions: false, professional: false, terminal: false }}
              blockUnloadWhenDirty={false}
              onChange={(projeto) => {
                // Uma edição depois da conferência deixa o resultado mostrado "de antes".
                if ((projeto.updatedAt ?? Number.POSITIVE_INFINITY) > conferidoEm.current)
                  setDesatualizado(true)
              }}
            />
          ) : naoAbriu ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p role="alert" className="text-sm">
                {TEXTOS_DO_DESAFIO.naoAbriu}
              </p>
              <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
                {TEXTOS_DO_DESAFIO.tentarDeNovo}
              </Button>
            </div>
          ) : (
            <Abrindo />
          )}
        </div>
        <section
          aria-labelledby={objetivosId}
          className="flex shrink-0 flex-col gap-2 border-border border-t bg-card px-3 py-2 sm:px-4"
          data-stale={desatualizado ? 'true' : undefined}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 id={objetivosId} className="min-w-0 font-semibold">
              <button
                type="button"
                className="flex min-h-11 items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-ring"
                aria-expanded={verObjetivos}
                onClick={() => setVerObjetivos((aberto) => !aberto)}
              >
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span>{TEXTOS_DO_DESAFIO.objetivos}</span>
                  <span className="font-normal text-muted-foreground text-xs">
                    {TEXTOS_DO_DESAFIO.progresso(feitos, obrigatorios.length)}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={`size-4 shrink-0 ${verObjetivos ? 'rotate-180' : ''}`}
                />
              </button>
            </h3>
            <Button
              variant={cumprido && !desatualizado ? 'outline' : 'default'}
              disabled={ocupado || saindo || !aberto}
              onClick={() => void conferir()}
              className="h-11 rounded-full px-5 font-semibold"
            >
              {ocupado ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              {ocupado ? TEXTOS_DO_DESAFIO.conferindo : TEXTOS_DO_DESAFIO.conferir}
            </Button>
          </div>
          <div
            hidden={!verObjetivos}
            className="max-h-48 space-y-3 overflow-y-auto overscroll-contain pr-1"
          >
            <ObjectiveList items={obrigatorios} estadoDe={estadoDe} stale={desatualizado} />
            {extras.length > 0 ? (
              <div className="space-y-2">
                <p className="flex flex-wrap items-baseline gap-x-2 font-semibold text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles aria-hidden className="size-4 text-primary" />
                    {desafio.desafioExtra?.titulo ?? TEXTOS_DO_DESAFIO.extra}
                  </span>
                  <span className="font-normal text-muted-foreground text-xs">
                    {TEXTOS_DO_DESAFIO.extraNota}
                  </span>
                </p>
                <ObjectiveList items={extras} estadoDe={estadoDe} stale={desatualizado} extra />
              </div>
            ) : null}
          </div>
          {desatualizado && resultados.length > 0 ? (
            <p className="flex items-start gap-2 text-muted-foreground text-sm">
              <RefreshCw aria-hidden className="mt-0.5 size-4 shrink-0" />
              {TEXTOS_DO_DESAFIO.mudou}
            </p>
          ) : null}
          {ocupado && rodaOJogo ? (
            <p className="text-muted-foreground text-sm">{TEXTOS_DO_DESAFIO.testando}</p>
          ) : null}
          {/* Sempre montada: a região viva só anuncia o que muda dentro dela. */}
          <p
            role="status"
            className="font-semibold text-sm empty:hidden data-[tom=erro]:text-destructive"
            data-tom={aviso?.tom}
          >
            {aviso?.texto ?? ''}
          </p>
          {naoGuardou ? (
            <Button
              variant="outline"
              disabled={saindo}
              onClick={() => void sair(true)}
              className="h-9 self-start rounded-full px-3 font-semibold"
            >
              {TEXTOS_DO_DESAFIO.sairSemGuardar}
            </Button>
          ) : null}
        </section>
      </div>
    </div>
  )
}

function Abrindo() {
  return (
    <p
      role="status"
      className="flex h-full items-center justify-center gap-2 text-muted-foreground text-sm"
    >
      <Loader2 aria-hidden className="size-4 animate-spin" />
      {TEXTOS_DO_DESAFIO.abrindo}
    </p>
  )
}
