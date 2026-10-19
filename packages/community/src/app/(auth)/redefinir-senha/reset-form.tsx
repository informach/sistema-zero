'use client'

import { Check, Clock, LinkIcon, Unlink } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  AuthAlert,
  describedBy,
  errorCodeOf,
  Field,
  LiveMessage,
  MIN_PASSWORD,
  NETWORK_ERROR,
  PasswordField,
  PasswordRule,
  postJson,
  SubmitButton,
} from '@/components/community/auth/auth-fields'
import { AuthHeading, AuthHelpLink } from '@/components/community/auth-split-shell'

/** Os três jeitos de o link não servir, cada um com a sua página (antes, um toast que sumia). */
export type InvalidLinkKind = 'incompleto' | 'usado' | 'vencido'

const INVALID_BY_CODE: Record<string, InvalidLinkKind> = {
  // Usado ou adulterado: o servidor não separa os dois.
  INVALID_RESET_TOKEN: 'usado',
  RESET_TOKEN_EXPIRED: 'vencido',
}

/**
 * Criar a senha (direção de arte de 18/10/2026). Serve o 1º acesso pós-compra, o convite da equipe
 * e a bolsa: o link de uso único traz o código no endereço. Salvar mostra um cartão que fica na
 * tela; um link usado, vencido ou incompleto vira a página que diz o que aconteceu e o próximo passo.
 */
export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState<InvalidLinkKind | null>(token ? null : 'incompleto')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  // Salvar troca a tela inteira: a região viva fica montada por fora dela (uma região que nasce
  // junto com o texto não é anunciada) e o foco vai para o título da tela nova.
  const [announcement, setAnnouncement] = useState('')

  if (invalid || saved)
    return (
      <>
        {invalid ? <InvalidLink kind={invalid} focusOnMount={Boolean(token)} /> : <SavedCard />}
        <LiveMessage message={announcement} />
      </>
    )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAttempted(true)
    const mismatch = confirm !== password ? 'As duas senhas estão diferentes.' : null
    setConfirmError(mismatch)
    if (mismatch || password.length < MIN_PASSWORD) return
    setLoading(true)
    setServerError(null)
    try {
      const res = await postJson('/api/auth/reset-password', { token, newPassword: password })
      if (res.ok) {
        setAnnouncement('Senha criada.')
        setSaved(true)
        return
      }
      const code = await errorCodeOf(res)
      // O BFF recusa o token curto (o e-mail quebrou o link no meio) com `INVALID_INPUT`: é a
      // página do link incompleto, não um "tente de novo" que nunca vai dar certo.
      const kind =
        INVALID_BY_CODE[code] ??
        (code === 'INVALID_INPUT' && token.length < 10 ? 'incompleto' : undefined)
      if (kind) {
        setAnnouncement(INVALID_COPY[kind].title)
        setInvalid(kind)
        return
      }
      setServerError(
        code === 'VALIDATION_ERROR'
          ? 'Escolha uma senha com pelo menos 10 caracteres (não vale só espaços).'
          : 'Não foi possível salvar a senha. Tente de novo.',
      )
    } catch {
      setServerError(NETWORK_ERROR)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        kicker="PRIMEIRO ACESSO"
        title="Criar a sua senha"
        lead="Com ela, você entra na sua área de aluno usando o e-mail da compra."
      />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field id="password" label="Senha nova">
          <PasswordField
            id="password"
            value={password}
            onChange={setPassword}
            visible={visible}
            onToggle={() => setVisible((v) => !v)}
            autoComplete="new-password"
            invalid={attempted && password.length < MIN_PASSWORD}
            ariaDescribedBy="password-regra"
          />
          <PasswordRule id="password-regra" length={password.length} attempted={attempted} />
        </Field>
        <Field id="confirm" label="Repita a senha" error={confirmError ?? undefined}>
          <PasswordField
            id="confirm"
            value={confirm}
            onChange={setConfirm}
            visible={visible}
            onToggle={() => setVisible((v) => !v)}
            autoComplete="new-password"
            invalid={Boolean(confirmError)}
            ariaDescribedBy={describedBy('confirm', { error: Boolean(confirmError) })}
            toggleable={false}
          />
        </Field>
        {serverError ? <AuthAlert tone="error">{serverError}</AuthAlert> : null}
        <SubmitButton loading={loading}>Salvar senha</SubmitButton>
      </form>
      <p className="m-0 text-muted-foreground text-xs">
        Este link funciona uma vez. Depois de salvar, entre com o e-mail e a senha nova.
      </p>
      <AuthHelpLink>Precisa de ajuda? Veja a ajuda para entrar</AuthHelpLink>
      <LiveMessage message={announcement} />
    </div>
  )
}

function SavedCard() {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  return (
    <div className="flex flex-col gap-6">
      <div className="sz-card flex flex-col gap-4 p-7">
        <span
          aria-hidden="true"
          className="inline-flex size-14 items-center justify-center rounded-full bg-(--sucesso-tint) text-(--pen-ok-texto)"
        >
          <Check className="size-8" strokeWidth={2.6} />
        </span>
        <h1 ref={heading} tabIndex={-1} className="sz-h1-sm outline-none">
          Senha criada
        </h1>
        <p className="m-0">
          Agora entre com o e-mail da compra e a senha que você acabou de criar.
        </p>
        <Link href="/login" className="sz-btn min-h-[3rem] w-full">
          Ir para entrar
        </Link>
      </div>
      <AuthHelpLink>Precisa de ajuda? Veja a ajuda para entrar</AuthHelpLink>
    </div>
  )
}

const INVALID_COPY: Record<
  InvalidLinkKind,
  { icon: typeof LinkIcon; title: string; paragraphs: string[] }
> = {
  incompleto: {
    icon: LinkIcon,
    title: 'Este link está incompleto',
    paragraphs: [
      'Às vezes o e-mail quebra o link em duas linhas. Abra o e-mail de novo e toque no botão, em vez de copiar o endereço.',
      'Se não der certo, peça um código para criar a senha.',
    ],
  },
  usado: {
    icon: Unlink,
    title: 'Este link não vale mais',
    paragraphs: [
      'Cada link de senha funciona uma vez. Se você já criou a senha, é só entrar com o e-mail e a senha.',
      'Não lembra a senha, ou o link chegou quebrado? Peça um código e crie outra.',
    ],
  },
  vencido: {
    icon: Clock,
    title: 'Este link venceu',
    paragraphs: [
      'Por segurança, o link de senha vale por um tempo limitado. Peça um código por e-mail e crie a senha em dois passos.',
    ],
  },
}

export function InvalidLink({
  kind,
  focusOnMount = false,
}: {
  kind: InvalidLinkKind
  /** Depois de tentar salvar (o link venceu no meio): o foco vai para o título. */
  focusOnMount?: boolean
}) {
  const copy = INVALID_COPY[kind]
  const Icon = copy.icon
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusOnMount) heading.current?.focus()
  }, [focusOnMount])
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="link-invalido" className="sz-card flex flex-col gap-4 p-7">
        <span
          aria-hidden="true"
          className="inline-flex size-14 items-center justify-center rounded-2xl bg-(--aviso-tint) text-(--aviso-texto)"
        >
          <Icon className="size-7" />
        </span>
        <h1 id="link-invalido" ref={heading} tabIndex={-1} className="sz-h1-sm outline-none">
          {copy.title}
        </h1>
        {copy.paragraphs.map((p) => (
          <p key={p} className="m-0">
            {p}
          </p>
        ))}
        {kind === 'usado' ? (
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="sz-btn min-h-[3rem] flex-1 basis-[10rem]">
              Entrar
            </Link>
            <Link
              href="/esqueci-senha"
              className="sz-btn-outline min-h-[3rem] flex-1 basis-[12rem]"
            >
              Esqueci minha senha
            </Link>
          </div>
        ) : (
          <Link
            href="/esqueci-senha"
            className="sz-btn h-auto min-h-[3rem] w-full whitespace-normal py-2.5 text-center"
          >
            Pedir um código por e-mail
          </Link>
        )}
      </section>
      <AuthHelpLink>Ainda com dúvida? Veja a ajuda para entrar</AuthHelpLink>
    </div>
  )
}
