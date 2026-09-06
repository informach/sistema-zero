'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Gift } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiGet, apiSend } from '@/lib/api'
import type { AmbassadorEnrollmentView } from '@/lib/types'

/**
 * Card "Indique e ganhe" da área dos pais: o responsável vira embaixador da
 * Bolsa do Primeiro Jogo com um clique (os dados já são os da conta) e recebe
 * o link da própria página por e-mail. Best-effort: serviço fora → card some.
 * O VALOR do bônus vem do serviço (`bonus.amountCents`) — nunca fica cravado
 * na copy, senão uma mudança de env deixaria esta tela prometendo errado.
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
      // Só o cadastro NOVO dispara o e-mail do link — vínculo/retomada não
      // manda nada, e prometer um e-mail que não sai deixaria a pessoa esperando.
      if (res.created) {
        toast.success('Pronto! Enviamos o link da sua página de embaixador por e-mail.')
      } else {
        toast.success('Sua página de embaixador já estava pronta. Os links estão aqui embaixo.')
      }
    } catch {
      toast.error('Não foi possível concluir agora. Tente de novo em instantes.')
    }
    setEnrolling(false)
  }

  async function copyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setManualCopy(null)
      toast.success('Link de bolsa copiado!')
    } catch {
      // Clipboard bloqueado (permissão/contexto): mostra o link para copiar à
      // mão — nada de window.prompt (padrão que o kids aposentou).
      setManualCopy(url)
    }
  }

  if (failed || !view) return null

  const bonusValue = formatBrlCents(view.bonus?.amountCents ?? 3000)
  const redeemed = view.stats?.redemptionsCompleted ?? 0
  const bonusTotal = (view.bonus?.eligibleCount ?? 0) + (view.bonus?.paidCount ?? 0)
  const paused = view.enrolled && view.ambassador?.status !== 'active'

  return (
    <section className="w-full max-w-2xl">
      <div className="rounded-2xl border-2 border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Gift className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="sz-display text-xl text-foreground">Indique e ganhe</h2>
            {paused ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Sua página de embaixador está pausada no momento, então os links de bolsa não
                funcionam. Se quiser reativar, fale com a gente pelo Atendimento aqui da Área dos
                pais.
              </p>
            ) : view.enrolled && view.ambassador ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Compartilhe o seu link de bolsa e presenteie crianças que você conhece com o
                  Desafio do Primeiro Jogo completo, de graça. Se a família depois assinar a
                  Comunidade dos Criadores, você recebe um agradecimento de {bonusValue} por Pix.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {redeemed} bolsa{redeemed === 1 ? '' : 's'} resgatada{redeemed === 1 ? '' : 's'}
                  {bonusTotal > 0
                    ? ` e ${bonusTotal} bônus a caminho ou pago${bonusTotal === 1 ? '' : 's'}. Os detalhes ficam na sua página.`
                    : '.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {view.ambassador.shareUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        view.ambassador?.shareUrl && copyShareUrl(view.ambassador.shareUrl)
                      }
                    >
                      Copiar link de bolsa
                    </Button>
                  ) : null}
                  <a
                    href={view.ambassador.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  >
                    Abrir minha página
                  </a>
                </div>
                {manualCopy ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Não consegui copiar sozinho. Segure e copie o link:{' '}
                    <code className="break-all rounded bg-muted px-1 py-0.5">{manualCopy}</code>
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vire embaixador(a) e presenteie crianças que você conhece com uma bolsa 100% do
                  Desafio do Primeiro Jogo. E tem mais: quando uma família indicada assina a
                  Comunidade dos Criadores, você recebe um agradecimento de {bonusValue} por Pix,
                  depois da garantia de 7 dias.
                </p>
                <div className="mt-3">
                  <Button size="sm" onClick={() => void enroll()} disabled={enrolling}>
                    {enrolling ? 'Cadastrando…' : 'Quero ser embaixador(a)'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function formatBrlCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
