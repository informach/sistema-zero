'use client'

import { comunidadeAdultoContinuarUrl } from '@sistemazero/member-shell/lib/adult-links'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import { CREATIVE_TOOLS, type CreativeToolKey, type ToolLock } from '@/lib/tool-lock'

/** A etapa atual tem página (há cursos por fazer); sem ela, o botão leva a Seu progresso. */
function hasCurrentStage(lock: ToolLock): boolean {
  return lock.stageHref?.startsWith('/cursos/etapa/') === true
}

/** O recado de quem chegou a uma ferramenta fechada, pelo motivo. */
function lockedCopy(name: string, lock: ToolLock | null | undefined) {
  if (lock?.reason === 'plan') {
    const community = `O ${name} faz parte da Comunidade dos Criadores.`
    if (lock.earned)
      return `${community} Com a assinatura, ele volta a abrir na sua conta, com o que você já fez.`
    return lock.stageTitle
      ? `${community} Na Comunidade, ele abre quando você chega à etapa ${lock.stageTitle} da jornada.`
      : `${community} Na Comunidade, ele abre conforme você avança nas etapas da jornada.`
  }
  if (lock?.reason === 'journey') {
    const path = hasCurrentStage(lock) ? ' O caminho começa pelos cursos da etapa atual.' : ''
    return lock.stageTitle
      ? `O ${name} abre quando você chega à etapa ${lock.stageTitle}.${path}`
      : `O ${name} abre conforme você avança nas etapas da jornada.${path}`
  }
  if (lock?.reason === 'advanced')
    return `O ${name} abre depois que você conclui um curso avançado da jornada.`
  return 'Esta ferramenta ainda não está liberada para sua conta. Consulte seus cursos ou fale com a equipe.'
}

/** A cor da arte de cada ferramenta: a mesma da faixa do cartão em Criar. */
const TOOL_COLORS: Record<CreativeToolKey, string> = {
  estudio: 'var(--sz-community-blue)',
  'estudio-pro': 'var(--sz-community-blue)',
  pinta: 'var(--sz-community-pink)',
  molda: 'var(--sz-community-orange)',
  pensa: 'var(--sz-community-purple)',
}

/**
 * A tela de quem chega a uma ferramenta fechada (Estúdio à noite, 25/10/2026): o palco com o
 * recado à esquerda (o motivo, o próximo passo e a volta para Criar) e a arte da ferramenta com o
 * cadeado à direita. ⚠️ As rotas das ferramentas são de tela cheia (`data-embedded`, base de 16 px);
 * o `data-sz-tool-notice` devolve a letra de 20 px da comunidade só a esta tela (`globals.css`).
 */
export function ToolNotice({
  tool,
  lock,
  unavailable = false,
  readOnly = false,
}: {
  tool: CreativeToolKey
  /** O motivo do cadeado (`toolLock`); sem ele, o recado genérico. */
  lock?: ToolLock | null
  unavailable?: boolean
  readOnly?: boolean
}) {
  const { name } = CREATIVE_TOOLS[tool]
  const locked = !unavailable && !readOnly
  const color = TOOL_COLORS[tool]
  return (
    <section
      data-sz-tool-notice
      aria-labelledby="ferramenta-titulo"
      className="sz-palco flex min-h-full w-full flex-1 items-center overflow-y-auto"
    >
      <div className="sz-page grid w-full items-center gap-10 py-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-5">
          <span className="sz-kicker">
            {unavailable ? 'Ferramenta' : readOnly ? 'Modo de consulta' : 'Ferramenta fechada'}
          </span>
          <h1 id="ferramenta-titulo" className="sz-h1">
            {name}
          </h1>
          <p className="sz-lead m-0">
            {unavailable
              ? 'Não foi possível conferir seu acesso agora. Atualize a página para tentar novamente.'
              : readOnly
                ? 'A sessão de suporte está em modo de consulta. A edição livre está disponível na sessão do aluno.'
                : lockedCopy(name, lock)}
          </p>
          <div className="flex flex-wrap gap-3">
            {unavailable ? (
              <button type="button" onClick={() => window.location.reload()} className="sz-btn">
                Tentar novamente
              </button>
            ) : null}
            {locked && lock?.reason === 'plan' ? (
              <a
                href={comunidadeAdultoContinuarUrl(`ferramenta-${tool}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="sz-btn"
              >
                Ver como continuar
              </a>
            ) : null}
            {locked &&
            (lock?.reason === 'journey' || lock?.reason === 'advanced') &&
            lock.stageHref ? (
              <Link href={lock.stageHref} prefetch={false} className="sz-btn">
                {hasCurrentStage(lock) ? 'Ver os cursos da etapa' : 'Ver a sua jornada'}
              </Link>
            ) : null}
            <Link href="/criar" prefetch={false} className="sz-btn-outline">
              Voltar para Criar
            </Link>
          </div>
          <Link href="/cursos" prefetch={false} className="sz-link">
            Ver os cursos
          </Link>
        </div>
        <div
          aria-hidden="true"
          className="relative hidden aspect-[16/10] items-center justify-center overflow-hidden rounded-[1.2rem] md:flex"
          style={{
            background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, var(--dourado)))`,
          }}
        >
          <span className="font-(family-name:--font-pixel) text-[2.6rem] text-white uppercase leading-none tracking-[0.12em] [text-shadow:4px_4px_0_rgb(0_0_0/0.35)]">
            {name}
          </span>
          {locked ? (
            <span className="absolute top-4 right-4 inline-flex size-14 items-center justify-center rounded-2xl bg-(--noite)/80 text-(--texto-claro)">
              <Lock className="size-7" />
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}
