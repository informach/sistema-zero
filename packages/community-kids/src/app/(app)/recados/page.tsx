import { Mail } from 'lucide-react'
import { redirect } from 'next/navigation'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { KidsStepCard } from '@/components/kids/kids-step-card'
import { listTeacherThreadsReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { RecadosClient } from './recados-client'

export const dynamic = 'force-dynamic'

/** Como um recado nasce e volta. Três passos, na ordem em que acontecem. */
const PASSOS = [
  {
    title: 'Você envia um projeto ou uma dúvida',
    text: 'Pode ser uma entrega do Estúdio, um jogo publicado no Mural ou uma pergunta na aula.',
  },
  {
    title: 'O professor olha com calma',
    text: 'Ele joga o que você fez, lê o que você escreveu e responde por aqui.',
  },
  {
    title: 'A conversa continua',
    text: 'Você pode responder de volta quantas vezes quiser. Cada recado guarda a conversa inteira.',
  },
]

/**
 * Caixa de entrada dos "Recados do professor" (canal de retorno). Server Component:
 * busca as conversas do aluno (readonly, sem refresh de cookie) e entrega ao client.
 */
export default async function RecadosPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const res = await listTeacherThreadsReadonly()
  const threads = res.status === 200 ? (res.body?.threads ?? []) : []
  return (
    <>
      <KidsBand tone="creme">
        <KidsPageHeader
          eyebrow="Comunidade"
          eyebrowIcon={Mail}
          title="Recados do professor"
          subtitle="De vez em quando o professor deixa um recado para você aqui."
        />
      </KidsBand>
      <KidsBand tone="menta">
        <RecadosClient initialThreads={threads} initialNextOffset={res.body?.nextOffset ?? null} />
      </KidsBand>
      <KidsBand tone="lilas">
        <h2 className="sz-display text-[clamp(1.4rem,3vw,1.9rem)]">Como funciona um recado</h2>
        <div className="kids-unit-verde mt-5 grid gap-3">
          {PASSOS.map((passo, i) => (
            <KidsStepCard key={passo.title} step={i + 1} title={passo.title}>
              {passo.text}
            </KidsStepCard>
          ))}
        </div>
      </KidsBand>
    </>
  )
}
