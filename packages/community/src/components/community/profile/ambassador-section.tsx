'use client'

import { Spinner } from '@sistemazero/ui/spinner'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiSend } from '@/lib/api'
import type { AmbassadorEnrollmentView } from '@/lib/types'

/** Os termos do agradecimento: ficam no ponto em que a pessoa se compromete (como no Kids). */
export const AMBASSADOR_TERMS =
  'É um agradecimento único por indicação que virar assinatura. Não é salário nem renda garantida e não cria vínculo com a plataforma.'

const SUPPORT_HREF = '/ajuda#atendimento'

/**
 * "Embaixador" em Meu perfil (20/10/2026): a pessoa adulta vira embaixadora do presente com um
 * clique e copia um link para cada público (um adulto que quer criar o próprio jogo ou uma família
 * com criança de 9 a 14 anos). A lógica dos estados é a do cartão da área dos pais do Kids
 * (`community-kids/src/app/pais/_components/ambassador-card.tsx`), na voz do adulto.
 *
 * ⚠️ Regra da dona (20/10/2026): dentro da comunidade vale a identidade DESTE app (`sz-card`,
 * `sz-h3`, `sz-btn`/`sz-btn-outline`, texto apagado). A cara da oferta adulta fica no funil.
 *
 * A página lê a inscrição no servidor e só monta a parte quando o serviço responde (best effort:
 * fora do ar, a parte e o atalho somem) e a sessão é da própria conta: numa sessão de suporte a
 * seção não aparece, porque o `pageUrl` é a capability-URL que troca a chave Pix. O VALOR do bônus vem do serviço (`bonus.amountCents`) e
 * nunca fica cravado aqui.
 */
export function AmbassadorSection({ initial }: { initial: AmbassadorEnrollmentView }) {
  const [view, setView] = useState(initial)
  const [enrolling, setEnrolling] = useState(false)
  const [manualCopy, setManualCopy] = useState<string | null>(null)

  async function enroll() {
    if (enrolling) return
    setEnrolling(true)
    try {
      const res = await apiSend<AmbassadorEnrollmentView>('/api/embaixador', 'POST')
      setView(res)
      // Só o cadastro NOVO dispara o e-mail do link; prometer um e-mail que não sai deixaria a
      // pessoa esperando.
      if (res.emailPending) {
        toast.success(
          res.linkEmailSent
            ? 'Já existe um cadastro de embaixador com o seu e-mail. Acabamos de reenviar o link da página para lá.'
            : 'Já existe um cadastro de embaixador com o seu e-mail, mas o envio falhou agora. Fale com a gente pelo Atendimento.',
        )
      } else if (res.created) {
        toast.success(
          res.linkEmailSent
            ? 'Sua página está pronta. O e-mail com o link foi encaminhado, e você também pode abrir pelo link abaixo.'
            : 'Sua página está pronta, mas o e-mail com o link não foi encaminhado agora. Você pode abrir pelo link abaixo.',
        )
      } else {
        toast.success('Sua página de embaixador já estava pronta. Os links estão aqui embaixo.')
      }
    } catch {
      toast.error('Não foi possível concluir agora. Tente de novo em instantes.')
    } finally {
      setEnrolling(false)
    }
  }

  async function copy(url: string, done: string) {
    try {
      await navigator.clipboard.writeText(url)
      setManualCopy(null)
      toast.success(done)
    } catch {
      // Área de transferência bloqueada: mostra o link para copiar à mão, sem `window.prompt`.
      setManualCopy(url)
    }
  }

  const bonusCents = view.bonus?.amountCents
  const bonusValue = typeof bonusCents === 'number' ? formatBrlCents(bonusCents) : null
  const redeemed = view.stats?.redemptionsCompleted ?? 0
  const eligible = view.bonus?.eligibleCount ?? 0
  const bonusTotal = eligible + (view.bonus?.paidCount ?? 0)
  const ambassador = view.enrolled ? view.ambassador : undefined
  const paused = view.enrolled && view.ambassador?.status !== 'active'
  const needsPixKey = eligible > 0 && ambassador?.pixKeySet === false
  const adultUrl = ambassador?.shareUrls?.adult ?? null
  // `shareUrl` é o link Kids de sempre: segura o botão da família diante de um referrals antigo.
  const familyUrl = ambassador?.shareUrls?.kids ?? ambassador?.shareUrl ?? null

  return (
    <section
      id="embaixador"
      aria-labelledby="perfil-embaixador"
      // O presente é comemoração: o bloco de palco no meio da bancada (Estúdio à noite).
      className="sz-palco flex scroll-mt-28 flex-col gap-5 rounded-[1.2rem] p-6 md:p-8"
    >
      <div className="flex flex-col gap-1.5">
        {ambassador && !paused ? <span className="sz-kicker text-(--cta)">Embaixador</span> : null}
        <h2 id="perfil-embaixador" className="sz-h3">
          {ambassador && !paused ? 'Você é embaixador(a) do Sistema Zero' : 'Embaixador'}
        </h2>
        {paused ? (
          <p className="text-[0.9rem] text-muted-foreground">
            Sua página de embaixador está pausada no momento, então os links do presente não
            funcionam. Se quiser reativar, fale com a gente pelo{' '}
            <Link href={SUPPORT_HREF} prefetch={false} className="sz-link">
              Atendimento
            </Link>
            .
          </p>
        ) : ambassador ? (
          <p className="text-[0.9rem] text-muted-foreground">
            {redeemed} presente{redeemed === 1 ? '' : 's'} resgatado{redeemed === 1 ? '' : 's'}{' '}
            pelos seus links
            {bonusTotal > 0
              ? ` e ${bonusTotal} bônus a caminho ou pago${bonusTotal === 1 ? '' : 's'}`
              : ''}
            . O bônus e a chave Pix ficam na sua página.
          </p>
        ) : view.emailPending ? (
          // Já existe embaixador com este e-mail: por segurança o link vai para a CAIXA do dono
          // (a plataforma não verifica e-mail), então aqui não aparece link nenhum.
          <p className="text-[0.9rem] text-muted-foreground">
            Já existe um cadastro de embaixador com o seu e-mail. Por segurança, o link da página
            vai sempre por e-mail: procure a mensagem com o link da sua página de embaixador. Se não
            chegar, fale com a gente pelo{' '}
            <Link href={SUPPORT_HREF} prefetch={false} className="sz-link">
              Atendimento
            </Link>
            .
          </p>
        ) : (
          <p className="text-[0.9rem] text-muted-foreground">
            Dê 7 dias no Sistema Zero, sem custo para quem recebe, a um adulto que quer criar o
            próprio jogo ou a uma família com criança de 9 a 14 anos. Se alguém que recebeu o seu
            presente assinar a Comunidade dos Criadores, adulta ou Kids, você recebe um
            agradecimento{bonusValue ? ` de ${bonusValue}` : ''} por Pix, depois da garantia de 7
            dias.
          </p>
        )}
      </div>

      {ambassador && !paused ? (
        <>
          {needsPixKey ? (
            <p role="status" className="sz-soft p-3 text-[0.9rem] text-foreground">
              Falta a sua chave Pix para o dinheiro chegar. Abra a sua página e cadastre a chave:
              sem ela o pagamento fica parado esperando.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2.5">
            {adultUrl ? (
              <button
                type="button"
                className="sz-btn"
                onClick={() => void copy(adultUrl, 'Link para um adulto copiado.')}
              >
                Copiar link para um adulto
              </button>
            ) : null}
            {familyUrl ? (
              <button
                type="button"
                className="sz-btn-outline"
                onClick={() => void copy(familyUrl, 'Link para uma família copiado.')}
              >
                Copiar link para uma família
              </button>
            ) : null}
            <a
              href={ambassador.pageUrl}
              target="_blank"
              rel="noreferrer"
              className="sz-link inline-flex min-h-[2.8rem] items-center px-2"
            >
              Abrir minha página
              <span className="sr-only"> (abre em outra aba)</span>
            </a>
          </div>
          {manualCopy ? (
            // O sucesso é anunciado por toast; a falha precisa do mesmo tratamento no leitor de
            // tela.
            <p role="alert" className="text-[0.9rem] text-muted-foreground">
              Não foi possível copiar sozinho. Selecione e copie o link:{' '}
              <code className="break-all rounded bg-muted px-1 py-0.5">{manualCopy}</code>
            </p>
          ) : null}
        </>
      ) : !view.enrolled && !view.emailPending ? (
        <>
          <p className="text-xs text-muted-foreground">{AMBASSADOR_TERMS}</p>
          <button
            type="button"
            className="sz-btn self-start"
            onClick={() => void enroll()}
            disabled={enrolling}
          >
            {enrolling ? <Spinner /> : null}
            {enrolling ? 'Cadastrando…' : 'Quero ser embaixador(a)'}
          </button>
        </>
      ) : null}
    </section>
  )
}

function formatBrlCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
