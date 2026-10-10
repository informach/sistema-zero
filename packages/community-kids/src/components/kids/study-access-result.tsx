'use client'

import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { Button } from '@sistemazero/ui/button'
import { CheckCircle2, Copy } from 'lucide-react'
import { useState } from 'react'
import { formatAccessEnd } from '@/lib/study-access-view'
import { StudentAreaButton } from './student-area-button'

const COPY_FIELD =
  'min-w-0 rounded-xl border border-border bg-card p-3 text-center font-mono tracking-widest'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * O código para o OUTRO aparelho, com o endereço deste ambiente: o responsável muitas vezes
 * prepara pelo celular e a criança digita no computador, que precisa abrir a MESMA comunidade
 * (staging e produção têm endereços diferentes).
 */
export function AccessCodeResult({
  name,
  code,
  expired,
  busy,
  checkedWithoutEntry,
  onCheck,
  onCopyFailed,
}: {
  name: string
  code: string
  expired: boolean
  busy: boolean
  checkedWithoutEntry: boolean
  onCheck: () => void
  onCopyFailed: () => void
}) {
  // ⚠️ Lido na primeira renderização, e não num efeito: o resultado só existe depois de um
  // clique (nunca no HTML do servidor), e com o efeito o endereço chegava um quadro depois do
  // código (o CI carregado pegava a tela sem ele, 10/10/2026).
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin))
  const [copied, setCopied] = useState<'code' | 'address' | null>(null)
  // Só um endereço de verdade (http/https) vira texto para copiar.
  const address = /^https?:\/\//.test(origin) ? origin.replace(/^https?:\/\//, '') : ''
  async function copy(kind: 'code' | 'address') {
    if (await copyText(kind === 'code' ? code : origin)) setCopied(kind)
    else onCopyFailed()
  }
  return (
    <div
      role="status"
      className="rounded-2xl border-2 border-primary bg-primary/5 p-5 [&_button]:min-h-11 [&_button]:rounded-full"
    >
      <h3 className="font-bold">{expired ? 'Esse código venceu' : `Código para ${name}`}</h3>
      {!expired ? (
        <>
          <p className="mt-2 text-sm">
            No computador da criança, abra a plataforma neste endereço, clique em{' '}
            <strong>Eu sou aluno</strong> e digite este código.
          </p>
          {address ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                aria-label="Endereço da plataforma"
                readOnly
                value={address}
                className={`${COPY_FIELD} w-full max-w-xs text-sm tracking-normal`}
                onFocus={(event) => event.target.select()}
              />
              <Button variant="secondary" onClick={() => void copy('address')}>
                <Copy className="size-4" aria-hidden="true" />
                {copied === 'address' ? 'Endereço copiado' : 'Copiar endereço'}
              </Button>
            </div>
          ) : null}
          <div className="my-4 flex flex-wrap items-center gap-3">
            <input
              aria-label="Código para copiar"
              readOnly
              value={code}
              className={`${COPY_FIELD} w-48 text-xl`}
              onFocus={(event) => event.target.select()}
            />
            <Button variant="secondary" onClick={() => void copy('code')}>
              <Copy className="size-4" aria-hidden="true" />
              {copied === 'code' ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="text-sm">
            O código vale por 10 minutos e libera um único navegador. Depois de usar o código, o
            acesso dura pelo prazo que você escolheu.
          </p>
          <Button variant="ghost" className="mt-3" disabled={busy} onClick={onCheck}>
            Conferir se a criança já entrou
          </Button>
          {checkedWithoutEntry ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Ainda não. Quando a criança digitar o código, o aparelho aparece na lista acima.
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm">
          Gere outro código no formulário acima. O código vencido não libera novos aparelhos.
        </p>
      )}
    </div>
  )
}

/** "Neste aparelho": a confirmação com a data real e a troca segura para a criança. */
export function CurrentDeviceReady({
  name,
  grant,
  studentDestination,
}: {
  name: string
  grant: StudyGrantView
  studentDestination?: string
}) {
  return (
    <div
      role="status"
      className="rounded-2xl border-2 border-(--success-foreground) bg-(--band-menta) p-5"
    >
      <p className="flex items-start gap-2 font-bold">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        Este navegador está liberado para {name} até {formatAccessEnd(grant.expiresAt)}.
      </p>
      <p className="mt-2 text-sm">
        Quando a criança for usar o computador, clique em Ir para a área do aluno. Isso fecha o seu
        acesso de responsável neste navegador.
      </p>
      <div className="mt-3">
        <StudentAreaButton destination={studentDestination} />
      </div>
    </div>
  )
}

/** O painel percebeu a entrada da criança: o código sai da tela, porque já foi usado. */
export function ChildJoinedNotice({ name, label }: { name: string; label: string }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-2xl bg-(--band-menta) p-4 text-sm font-bold"
    >
      <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      Pronto! {name} já entrou em {label}. O código foi usado e não vale mais.
    </p>
  )
}
