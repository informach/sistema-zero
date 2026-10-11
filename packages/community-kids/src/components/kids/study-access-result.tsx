'use client'

import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { CheckCircle2, Copy } from 'lucide-react'
import { useState } from 'react'
import { formatAccessEnd } from '@/lib/study-access-view'
import { StudentAreaButton } from './student-area-button'

/** Os botões dentro do cartão azul do código: o branco cheio e o de vidro, em pílula de 44px. */
const INVERSE =
  'kids-marca-inverso inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 font-bold text-sm'
const GLASS =
  'kids-marca-vidro inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full px-5 font-bold text-sm disabled:opacity-60'

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
    <div role="status" className="kids-marca flex flex-col gap-4 rounded-(--raio-carta) p-6">
      <h3 className="kids-marca-suave font-extrabold text-xs uppercase tracking-[0.12em]">
        {expired ? 'Esse código venceu' : `Código para ${name}`}
      </h3>
      {!expired ? (
        <>
          <input
            aria-label="Código para copiar"
            readOnly
            value={code}
            className="sz-display w-full min-w-0 bg-transparent text-[2.4rem] leading-none tracking-[0.18em] outline-none focus-visible:outline-2 focus-visible:outline-offset-4"
            onFocus={(event) => event.target.select()}
          />
          <button type="button" className={INVERSE} onClick={() => void copy('code')}>
            <Copy className="size-4" aria-hidden="true" />
            {copied === 'code' ? 'Copiado' : 'Copiar'}
          </button>
          <p className="kids-marca-suave text-sm">
            No computador da criança, abra a plataforma neste endereço, clique em{' '}
            <strong>Eu sou criador(a)</strong> e digite este código.
          </p>
          {address ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Endereço da plataforma"
                readOnly
                value={address}
                className="kids-marca-vidro min-h-11 w-full min-w-0 max-w-xs flex-1 rounded-full px-4 text-sm outline-none focus-visible:outline-2"
                onFocus={(event) => event.target.select()}
              />
              <button type="button" className={GLASS} onClick={() => void copy('address')}>
                <Copy className="size-4" aria-hidden="true" />
                {copied === 'address' ? 'Endereço copiado' : 'Copiar endereço'}
              </button>
            </div>
          ) : null}
          <p className="kids-marca-suave text-sm">
            O código vale por 10 minutos e libera um único navegador. Depois de usar o código, o
            acesso dura pelo prazo que você escolheu.
          </p>
          <button type="button" className={GLASS} disabled={busy} onClick={onCheck}>
            Conferir se a criança já entrou
          </button>
          {checkedWithoutEntry ? (
            <p className="kids-marca-suave text-sm">
              Ainda não. Quando a criança digitar o código, o aparelho aparece na lista acima.
            </p>
          ) : null}
        </>
      ) : (
        <p className="kids-marca-suave text-sm">
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
      className="rounded-(--raio-carta) border-2 border-(--success-foreground) bg-(--band-menta) p-5"
    >
      <p className="flex items-start gap-2 font-bold">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        Este navegador está liberado para {name} até {formatAccessEnd(grant.expiresAt)}.
      </p>
      <p className="mt-2 text-sm">
        Quando a criança for usar o computador, clique em Ir para a área da criança. Isso fecha o
        seu acesso de responsável neste navegador.
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
