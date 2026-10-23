'use client'

import { Gift } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiGet, apiSend } from '@/lib/api'
import { EMBAIXADORES_URL } from '@/lib/links'
import type { AmbassadorEnrollmentView } from '@/lib/types'
import { PRIMARY_ACTION, SECONDARY_ACTION } from './parent-ui'

/**
 * Card de embaixador da área dos pais: o responsável vira embaixador do presente com um clique
 * (os dados já são os da conta) e recebe o link da própria página por e-mail. Desde 20/10/2026 o
 * presente tem dois públicos: uma família com criança de 9 a 14 anos (Kids) ou um adulto que quer
 * criar o próprio jogo. O cadastrado copia o link certo para cada um (`shareUrls`); sem
 * `shareUrls` (referrals antigo), o `shareUrl` é o link Kids.
 * ⚠️ Regra da dona (20/10/2026): o desenho é o da área dos pais de hoje (faixa lilás, ícone em
 * cartão branco, `PRIMARY_ACTION`/`SECONDARY_ACTION`). Só o texto muda; a cara da oferta adulta
 * fica no funil.
 * Best-effort: serviço fora → card some. O VALOR do bônus vem do serviço (`bonus.amountCents`) —
 * nunca fica cravado na copy, senão uma mudança de env deixaria esta tela prometendo errado.
 */
export function AmbassadorCard() {
  const [view, setView] = useState<AmbassadorEnrollmentView | null>(null)
  const [failed, setFailed] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [manualCopy, setManualCopy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setView(await apiGet<AmbassadorEnrollmentView>('/api/parents/embaixador'))
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function enroll() {
    if (enrolling) return
    setEnrolling(true)
    try {
      const res = await apiSend<AmbassadorEnrollmentView>('/api/parents/embaixador', 'POST')
      setView(res)
      // Só o cadastro NOVO dispara o e-mail do link — a retomada não manda
      // nada, e prometer um e-mail que não sai deixaria a pessoa esperando.
      if (res.emailPending) {
        toast.success(
          res.linkEmailSent
            ? 'Já existe um cadastro de embaixador com o seu e-mail. Acabamos de reenviar o link da página para lá.'
            : 'Já existe um cadastro de embaixador com o seu e-mail, mas o envio falhou agora. Fale com a gente pelo Atendimento.',
        )
      } else if (res.created) {
        toast.success(
          res.linkEmailSent
            ? 'Sua página está pronta. O e-mail com o link foi encaminhado; você também pode abrir pelo botão abaixo.'
            : 'Sua página está pronta, mas o e-mail com o link não foi encaminhado agora. Você pode abrir pelo botão abaixo.',
        )
      } else {
        toast.success('Sua página de embaixador já estava pronta. Os links estão aqui embaixo.')
      }
    } catch {
      toast.error('Não foi possível concluir agora. Tente de novo em instantes.')
    }
    setEnrolling(false)
  }

  async function copyShareUrl(url: string, done: string) {
    try {
      await navigator.clipboard.writeText(url)
      setManualCopy(null)
      toast.success(done)
    } catch {
      // Clipboard bloqueado (permissão/contexto): mostra o link para copiar à
      // mão — nada de window.prompt (padrão que o kids aposentou).
      setManualCopy(url)
    }
  }

  if (failed || !view) return null

  // ⚠️ SEM fallback numérico: valor de dinheiro só aparece se o serviço mandar.
  // Um default cravado aqui volta a prometer R$ 30 depois de a env mudar.
  const bonusCents = view.bonus?.amountCents
  const bonusValue = typeof bonusCents === 'number' ? formatBrlCents(bonusCents) : null
  const redeemed = view.stats?.redemptionsCompleted ?? 0
  const eligible = view.bonus?.eligibleCount ?? 0
  const bonusTotal = eligible + (view.bonus?.paidCount ?? 0)
  const paused = view.enrolled && view.ambassador?.status !== 'active'
  // Bônus liberado + chave vazia = o Pix não tem para onde ir, e só o
  // embaixador resolve (a chave é cadastrada na página dele).
  const needsPixKey = eligible > 0 && view.ambassador?.pixKeySet === false
  // `shareUrl` é o Kids de sempre: segura o botão da família diante de um referrals antigo.
  const familyUrl = view.ambassador?.shareUrls?.kids ?? view.ambassador?.shareUrl ?? null
  const adultUrl = view.ambassador?.shareUrls?.adult ?? null

  return (
    <section id="embaixador" className="scroll-mt-24 rounded-(--raio-carta) bg-(--band-lilas) p-6">
      <div>
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card">
            <Gift className="size-6 text-(--level-elite)" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="sz-display text-xl text-foreground">
              {view.enrolled
                ? 'Você é embaixador do Sistema Zero'
                : 'Seja um embaixador do Sistema Zero'}
            </h2>
            {paused ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Sua página de embaixador está pausada no momento, então os links do presente não
                funcionam. Se quiser reativar, fale com a gente pelo Atendimento aqui da Área dos
                pais.
              </p>
            ) : view.enrolled && view.ambassador ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Compartilhe o link certo para cada pessoa: um para uma família, outro para um
                  adulto. {redeemed} presente{redeemed === 1 ? '' : 's'} resgatado
                  {redeemed === 1 ? '' : 's'}
                  {bonusTotal > 0
                    ? ` e ${bonusTotal} bônus a caminho ou pago${bonusTotal === 1 ? '' : 's'}.`
                    : '.'}{' '}
                  Os detalhes do bônus ficam na sua página.
                </p>
                {needsPixKey ? (
                  <p className="mt-2 rounded-xl bg-primary/10 p-2 text-sm text-foreground">
                    Falta a sua chave Pix para o dinheiro chegar. Abra a sua página e cadastre a
                    chave: sem ela o pagamento fica parado esperando.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {familyUrl ? (
                    <button
                      type="button"
                      className={PRIMARY_ACTION}
                      onClick={() => void copyShareUrl(familyUrl, 'Link para uma família copiado.')}
                    >
                      Copiar link para uma família
                    </button>
                  ) : null}
                  {adultUrl ? (
                    <button
                      type="button"
                      className={SECONDARY_ACTION}
                      onClick={() => void copyShareUrl(adultUrl, 'Link para um adulto copiado.')}
                    >
                      Copiar link para um adulto
                    </button>
                  ) : null}
                  <a
                    href={view.ambassador.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={SECONDARY_ACTION}
                  >
                    Abrir minha página
                  </a>
                </div>
                {manualCopy ? (
                  // O sucesso é anunciado por toast; a falha precisa do mesmo
                  // tratamento p/ quem usa leitor de tela.
                  <p role="alert" className="mt-2 text-xs text-muted-foreground">
                    Não consegui copiar sozinho. Segure e copie o link:{' '}
                    <code className="break-all rounded bg-muted px-1 py-0.5">{manualCopy}</code>
                  </p>
                ) : null}
              </>
            ) : view.emailPending ? (
              // Já existe embaixador com este e-mail: por segurança o link vai
              // para a CAIXA do dono (a plataforma não verifica e-mail), então
              // aqui não aparece link nenhum.
              <p className="mt-1 text-sm text-muted-foreground">
                Já existe um cadastro de embaixador com o seu e-mail. Por segurança, o link da
                página vai sempre por e-mail: procure a mensagem com o link da sua página de
                embaixador. Se não chegar, fale com a gente pelo Atendimento aqui da Área dos pais.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Como embaixador(a), você pode dar 7 dias no Sistema Zero, sem custo, a outra
                  família com criança de 9 a 14 anos ou a um adulto que quer criar o próprio jogo.
                  Se alguém que recebeu o seu presente assinar a Comunidade dos Criadores, Kids ou
                  adulta, você recebe um agradecimento{bonusValue ? ` de ${bonusValue}` : ''} por
                  Pix, depois da garantia de 7 dias.
                </p>
                {/* Os TERMOS moram aqui, no ponto em que a pessoa se
                    compromete: no funil eles só aparecem depois do primeiro
                    bônus, ou seja, justamente quem ainda não converteu nunca
                    os leria. (Texto a validar com o contador antes de divulgar.) */}
                <p className="mt-2 text-xs text-muted-foreground">
                  É um agradecimento único por indicação que virar assinatura. Não é salário nem
                  renda garantida e não cria vínculo com a plataforma.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    className={PRIMARY_ACTION}
                    onClick={() => void enroll()}
                    disabled={enrolling}
                  >
                    {enrolling ? 'Cadastrando…' : 'Quero ser embaixador(a)'}
                  </button>
                </div>
              </>
            )}
            <a
              href={EMBAIXADORES_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center font-bold text-primary text-sm underline-offset-4 hover:underline"
            >
              Como funciona o programa
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function formatBrlCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
