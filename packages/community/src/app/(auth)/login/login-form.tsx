'use client'

import Link from 'next/link'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  AuthAlert,
  CODE_ERROR,
  CodeInput,
  clockTime,
  describedBy,
  EMAIL_HINT_ERROR,
  errorCodeOf,
  Field,
  inputClass,
  LiveMessage,
  looksLikeEmail,
  NETWORK_ERROR,
  PasswordField,
  postJson,
  SubmitButton,
  TextButton,
} from '@/components/community/auth/auth-fields'
import { AuthHeading, AuthHelpLink } from '@/components/community/auth-split-shell'
import { cn } from '@/lib/cn'

/** As recusas do servidor, ditas para quem está entrando (sem jargão, com o próximo passo). */
const SERVER_MESSAGES: Record<string, ReactNode> = {
  INVALID_CREDENTIALS: (
    <>
      <strong>E-mail ou senha incorretos.</strong> Confira as letras maiúsculas e tente de novo, ou
      use “Esqueci minha senha”.
    </>
  ),
  INVALID_OTP: (
    <>
      <strong>Código errado ou vencido.</strong> Confira os 6 números ou toque em Reenviar código.
    </>
  ),
  INACTIVE: (
    <>
      <strong>Esta conta está inativa.</strong> Veja na ajuda para entrar como falar com a equipe.
    </>
  ),
  // Conta comprada que ainda não criou a senha: o código não entra por ela.
  PASSWORD_NOT_SET: (
    <>
      <strong>Você ainda não criou a sua senha.</strong> Abra o link da mensagem de boas-vindas ou
      use “Esqueci minha senha”.
    </>
  ),
  TOO_MANY_ATTEMPTS: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
  TOO_MANY_REQUESTS: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
  SERVICE_UNAVAILABLE: 'O acesso está fora do ar agora. Tente de novo em alguns instantes.',
}

type Mode = 'password' | 'otp'
type Errors = { email?: string; password?: string; code?: string }

/**
 * Entrar (direção de arte de 18/10/2026): por SENHA (padrão) ou por CÓDIGO no e-mail. Os erros
 * ficam escritos embaixo do campo e a recusa do servidor vira um aviso fixo acima do botão.
 */
export function LoginForm({ notice }: { notice?: ReactNode }) {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<ReactNode>(null)
  const [loading, setLoading] = useState(false)
  const [resentAt, setResentAt] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  // "Usar outro e-mail" desmonta o botão que tinha o foco: ele volta para o campo do e-mail; o
  // código enviado leva o foco para o campo do código.
  const emailInput = useRef<HTMLInputElement>(null)
  const codeInput = useRef<HTMLDivElement>(null)
  const focusAfter = useRef<'email' | 'code' | null>(null)
  useEffect(() => {
    const target = focusAfter.current
    focusAfter.current = null
    if (target === 'email' && !codeSent) emailInput.current?.focus()
    if (target === 'code' && codeSent) codeInput.current?.querySelector('input')?.focus()
  }, [codeSent])

  function goHome() {
    // Navegação de DOCUMENTO de propósito: o login muda cookies HttpOnly e o par
    // `router.replace + router.refresh` corre um contra o outro (vercel/next.js#54766). O full
    // load garante que o servidor veja a sessão nova; `replace` tira o /login do histórico.
    window.location.replace('/')
  }

  async function run(fn: () => Promise<void>) {
    setLoading(true)
    setServerError(null)
    try {
      await fn()
    } catch {
      setServerError(NETWORK_ERROR)
    } finally {
      setLoading(false)
    }
  }

  async function refuse(res: Response, fallback: string) {
    const code = await errorCodeOf(res)
    // O BFF recusa o e-mail com `INVALID_INPUT` (a régua daqui é a mesma, mas um e-mail colado
    // com espaço no meio ainda chega lá): o erro vai para o campo, onde a pessoa conserta.
    if (code === 'INVALID_INPUT') return setErrors({ email: EMAIL_HINT_ERROR })
    setServerError(SERVER_MESSAGES[code] ?? fallback)
  }

  async function submitPassword() {
    const next: Errors = {}
    if (!looksLikeEmail(email)) next.email = EMAIL_HINT_ERROR
    if (!password) next.password = 'Digite a sua senha.'
    setErrors(next)
    if (next.email || next.password) return
    await run(async () => {
      const res = await postJson('/api/auth/login', { email: email.trim(), password })
      if (res.ok) return goHome()
      await refuse(res, 'Não foi possível entrar. Tente de novo.')
    })
  }

  async function sendCode(resend = false) {
    if (!looksLikeEmail(email)) return setErrors({ email: EMAIL_HINT_ERROR })
    setErrors({})
    await run(async () => {
      // Anti-enumeração: com o Auth de pé a resposta é sempre 200. Limite (429) e indisponibilidade
      // (503) são reais e a pessoa precisa saber.
      const res = await postJson('/api/auth/otp/request', {
        email: email.trim(),
        purpose: 'sign_in',
      })
      if (!res.ok) return refuse(res, 'Não foi possível enviar o código. Tente de novo.')
      setCode('')
      if (resend) {
        const time = clockTime(new Date())
        setResentAt(time)
        setAnnouncement(`Código reenviado às ${time}. Confira o seu e-mail.`)
        return
      }
      setResentAt(null)
      setAnnouncement('Código enviado. Confira o seu e-mail e digite os 6 números.')
      focusAfter.current = 'code'
      setCodeSent(true)
    })
  }

  async function verifyCode() {
    if (code.length < 6) return setErrors({ code: CODE_ERROR })
    setErrors({})
    await run(async () => {
      const res = await postJson('/api/auth/otp/verify', { email: email.trim(), code })
      if (res.ok) return goHome()
      await refuse(res, 'Não foi possível entrar. Tente de novo.')
    })
  }

  function switchMode(next: Mode) {
    // Durante um envio a troca fica parada: a resposta do modo antigo apareceria no modo novo.
    if (next === mode || loading) return
    setMode(next)
    setErrors({})
    setServerError(null)
    setCode('')
    setCodeSent(false)
    setPassword('')
    setResentAt(null)
    setAnnouncement('')
  }

  function useAnotherEmail() {
    focusAfter.current = 'email'
    setCodeSent(false)
    setCode('')
    setErrors({})
    setServerError(null)
    setResentAt(null)
    setAnnouncement('')
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title="Entrar"
        lead="Acesse seus cursos, seus projetos e os recados da equipe."
      />

      {notice}

      <div
        role="group"
        aria-label="Como você quer entrar"
        className="grid grid-cols-2 gap-1.5 rounded-[0.8rem] bg-muted p-1.5"
      >
        <ModeButton
          pressed={mode === 'password'}
          disabled={loading}
          onClick={() => switchMode('password')}
        >
          Com senha
        </ModeButton>
        <ModeButton pressed={mode === 'otp'} disabled={loading} onClick={() => switchMode('otp')}>
          Com código por e-mail
        </ModeButton>
      </div>

      {mode === 'password' ? (
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            await submitPassword()
          }}
          className="flex flex-col gap-5"
        >
          <Field id="email" label="E-mail" error={errors.email}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nome@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email) || undefined}
              aria-describedby={describedBy('email', { error: Boolean(errors.email) })}
              className={inputClass(Boolean(errors.email))}
            />
          </Field>
          <Field id="password" label="Senha" error={errors.password}>
            <PasswordField
              id="password"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              autoComplete="current-password"
              invalid={Boolean(errors.password)}
              ariaDescribedBy={describedBy('password', { error: Boolean(errors.password) })}
            />
          </Field>
          {serverError ? <AuthAlert tone="error">{serverError}</AuthAlert> : null}
          <SubmitButton loading={loading}>Entrar</SubmitButton>
          <Link
            href="/esqueci-senha"
            className="sz-link inline-flex min-h-12 items-center self-center"
          >
            Esqueci minha senha
          </Link>
        </form>
      ) : (
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            await (codeSent ? verifyCode() : sendCode())
          }}
          className="flex flex-col gap-5"
        >
          <Field id="email" label="E-mail" error={errors.email}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nome@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              ref={emailInput}
              readOnly={codeSent}
              aria-invalid={Boolean(errors.email) || undefined}
              aria-describedby={describedBy('email', { error: Boolean(errors.email) })}
              className={inputClass(Boolean(errors.email))}
            />
          </Field>
          {codeSent ? (
            <>
              <AuthAlert tone="ok" live={false}>
                Se houver uma conta com este e-mail, enviamos um código de 6 números. Confira também
                a caixa de spam.
                {resentAt ? (
                  <strong className="mt-1 block">Código reenviado às {resentAt}.</strong>
                ) : null}
              </AuthAlert>
              <div ref={codeInput}>
                <Field id="code" label="Código de acesso" error={errors.code}>
                  <CodeInput
                    id="code"
                    value={code}
                    onChange={setCode}
                    invalid={Boolean(errors.code)}
                    ariaDescribedBy={describedBy('code', { error: Boolean(errors.code) })}
                  />
                </Field>
              </div>
            </>
          ) : null}
          {serverError ? <AuthAlert tone="error">{serverError}</AuthAlert> : null}
          <SubmitButton loading={loading}>{codeSent ? 'Entrar' : 'Enviar código'}</SubmitButton>
          {codeSent ? (
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-1">
              <TextButton onClick={() => sendCode(true)} disabled={loading}>
                Reenviar código
              </TextButton>
              <TextButton onClick={useAnotherEmail} disabled={loading}>
                Usar outro e-mail
              </TextButton>
            </div>
          ) : null}
          <p className="m-0 text-muted-foreground text-xs">
            O código entra pela conta que já tem senha criada. No primeiro acesso, crie a senha pelo
            link do e-mail de boas-vindas.
          </p>
        </form>
      )}

      <AuthAlert tone="info" live={false}>
        <strong>Primeiro acesso?</strong> Depois da compra, enviamos por e-mail e WhatsApp um link
        para você criar a sua senha. Abra o link e escolha a senha antes de entrar aqui.
      </AuthAlert>

      <LiveMessage message={announcement} />

      <AuthHelpLink>Não consegue entrar? Veja a ajuda para entrar</AuthHelpLink>
    </div>
  )
}

function ModeButton({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      className={cn(
        'min-h-14 rounded-[0.6rem] px-2 font-bold leading-tight focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2',
        pressed
          ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(15,26,51,0.18)]'
          : 'bg-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
