'use client'

import { comunidadeAdultoContinuarUrl } from '@sistemazero/member-shell/lib/adult-links'
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
  return (
    <section className="m-auto max-w-lg space-y-4 p-8 text-center">
      <h1 className="sz-display text-2xl">{name}</h1>
      <p>
        {unavailable
          ? 'Não foi possível conferir seu acesso agora. Atualize a página para tentar novamente.'
          : readOnly
            ? 'A sessão de suporte está em modo de consulta. A edição livre está disponível na sessão do aluno.'
            : lockedCopy(name, lock)}
      </p>
      {unavailable ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="sz-btn-gradient inline-flex"
        >
          Tentar novamente
        </button>
      ) : null}
      {locked && lock?.reason === 'plan' ? (
        <a
          href={comunidadeAdultoContinuarUrl(`ferramenta-${tool}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="sz-btn inline-flex"
        >
          Ver como continuar
        </a>
      ) : null}
      {locked && (lock?.reason === 'journey' || lock?.reason === 'advanced') && lock.stageHref ? (
        <Link href={lock.stageHref} prefetch={false} className="sz-btn inline-flex">
          {hasCurrentStage(lock) ? 'Ver os cursos da etapa' : 'Ver a sua jornada'}
        </Link>
      ) : null}
      <div className="flex justify-center gap-5">
        <Link href="/criar" prefetch={false}>
          Voltar para Criar
        </Link>
        <Link href="/cursos" prefetch={false}>
          Ver cursos
        </Link>
      </div>
    </section>
  )
}
