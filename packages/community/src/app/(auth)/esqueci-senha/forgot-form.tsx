'use client'

import { ArrowLeft, Check } from 'lucide-react'
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
  MIN_PASSWORD,
  NETWORK_ERROR,
  PasswordField,
  PasswordRule,
  postJson,
  SubmitButton,
  TextButton,
} from '@/components/community/auth/auth-fields'
import { AuthHeading, AuthHelpLink } from '@/components/community/auth-split-shell'
import { cn } from '@/lib/cn'

const SERVER_MESSAGES: Record<string, string> = {
  INVALID_OTP: 'Código errado ou vencido. Confira os 6 números ou toque em Reenviar código.',
  TOO_MANY_ATTEMPTS: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
  // O limite do gateway chega cru no passo de salvar (passthrough).
  TOO_MANY_REQUESTS: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
  SERVICE_UNAVAILABLE: 'O acesso está fora do ar agora. Tente de novo em alguns instantes.',
  VALIDATION_ERROR: 'Escolha uma senha nova com pelo menos 10 caracteres (não vale só espaços).',
}

type Step = 'email' | 'nova' | 'feito'
type Errors = { email?: string; code?: string; confirm?: string }

/**
 * Esqueci minha senha (direção de arte de 18/10/2026): dois passos com o indicador à vista, a regra
 * da senha respondendo enquanto a pessoa digita e, no fim, um cartão que fica na tela (antes, um
 * toast sumia e a pessoa voltava ao login sem saber se tinha dado certo). Anti-enumeração: pedir o
 * código responde sempre 200, e a tela segue para o passo 2 de qualquer forma.
 */
export function ForgotForm() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resentAt, setResentAt] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  // Trocar de passo desmonta o botão que tinha o foco: ele vai para o título do passo novo (ou
  // para o e-mail, ao voltar), e o leitor de tela não fica perdido no começo da página.
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const emailInput = useRef<HTMLInputElement>(null)
  const changedStep = useRef(false)
  useEffect(() => {
    if (!changedStep.current) return
    if (step === 'email') emailInput.current?.focus()
    else stepHeading.current?.focus()
  }, [step])

  function goTo(next: Step) {
    changedStep.current = true
    setStep(next)
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

  async function sendCode(resend = false) {
    if (!looksLikeEmail(email)) return setErrors({ email: EMAIL_HINT_ERROR })
    setErrors({})
    await run(async () => {
      const res = await postJson('/api/auth/otp/request', {
        email: email.trim(),
        purpose: 'password_reset',
      })
      if (!res.ok) {
        const code = await errorCodeOf(res)
        if (code === 'INVALID_INPUT') {
          if (step === 'nova') goTo('email')
          return setErrors({ email: EMAIL_HINT_ERROR })
        }
        setServerError(SERVER_MESSAGES[code] ?? 'Não foi possível enviar o código. Tente de novo.')
        return
      }
      setCode('')
      if (resend) {
        const time = clockTime(new Date())
        setResentAt(time)
        setAnnouncement(`Código reenviado às ${time}. Confira o seu e-mail.`)
        return
      }
      setResentAt(null)
      setAnnouncement('Código enviado. Confira o seu e-mail e digite os 6 números.')
      goTo('nova')
    })
  }

  async function savePassword() {
    setAttempted(true)
    const next: Errors = {}
    if (code.length < 6) next.code = CODE_ERROR
    if (confirm !== password) next.confirm = 'As duas senhas estão diferentes.'
    setErrors(next)
    if (next.code || next.confirm || password.length < MIN_PASSWORD) return
    await run(async () => {
      const res = await postJson('/api/auth/password/reset-otp', {
        email: email.trim(),
        code,
        newPassword: password,
      })
      if (res.ok) {
        setAnnouncement('Senha nova salva.')
        return goTo('feito')
      }
      const errorCode = await errorCodeOf(res)
      setServerError(
        SERVER_MESSAGES[errorCode] ?? 'Não foi possível salvar a senha nova. Tente de novo.',
      )
    })
  }

  function useAnotherEmail() {
    goTo('email')
    setResentAt(null)
    setAnnouncement('')
    setCode('')
    setPassword('')
    setConfirm('')
    setAttempted(false)
    setErrors({})
    setServerError(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/login" className="sz-link inline-flex min-h-12 items-center gap-2 self-start">
        <ArrowLeft aria-hidden="true" className="size-5" />
        Voltar para entrar
      </Link>

      <AuthHeading
        title="Esqueci minha senha"
        lead="Você cria uma senha nova em dois passos, com um código que chega no seu e-mail."
      />

      <ol aria-label="Passos" className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
        <StepItem n={1} state={step === 'email' ? 'atual' : 'feito'}>
          Receber o código
        </StepItem>
        <StepItem n={2} state={step === 'nova' ? 'atual' : step === 'feito' ? 'feito' : 'depois'}>
          Criar a senha nova
        </StepItem>
      </ol>

      {step === 'email' ? (
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            await sendCode()
          }}
          className="flex flex-col gap-5"
        >
          <Field
            id="email"
            label="E-mail da sua conta"
            hint="É o e-mail que você usou na compra."
            error={errors.email}
          >
            <input
              ref={emailInput}
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nome@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email) || undefined}
              aria-describedby={describedBy('email', { hint: true, error: Boolean(errors.email) })}
              className={inputClass(Boolean(errors.email))}
            />
          </Field>
          {serverError ? <AuthAlert tone="error">{serverError}</AuthAlert> : null}
          <SubmitButton loading={loading}>Enviar código</SubmitButton>
        </form>
      ) : null}

      {step === 'nova' ? (
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault()
            await savePassword()
          }}
          className="flex flex-col gap-5"
        >
          <h2 ref={stepHeading} tabIndex={-1} className="sz-h3 outline-none">
            Crie a senha nova
          </h2>
          {/* O gerenciador de senhas guarda a senha nova junto com o e-mail da conta. */}
          <input type="email" autoComplete="username" value={email.trim()} readOnly hidden />
          <AuthAlert tone="ok" live={false}>
            Se houver uma conta com <strong>{email.trim()}</strong>, enviamos um código de 6
            números. Confira também a caixa de spam.
            {resentAt ? (
              <strong className="mt-1 block">Código reenviado às {resentAt}.</strong>
            ) : null}
          </AuthAlert>
          <Field id="code" label="Código de acesso" error={errors.code}>
            <CodeInput
              id="code"
              value={code}
              onChange={setCode}
              invalid={Boolean(errors.code)}
              ariaDescribedBy={describedBy('code', { error: Boolean(errors.code) })}
            />
          </Field>
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
          <Field id="confirm" label="Repita a senha nova" error={errors.confirm}>
            <PasswordField
              id="confirm"
              value={confirm}
              onChange={setConfirm}
              visible={visible}
              onToggle={() => setVisible((v) => !v)}
              autoComplete="new-password"
              invalid={Boolean(errors.confirm)}
              ariaDescribedBy={describedBy('confirm', { error: Boolean(errors.confirm) })}
              toggleable={false}
            />
          </Field>
          {serverError ? <AuthAlert tone="error">{serverError}</AuthAlert> : null}
          <SubmitButton loading={loading}>Salvar a senha nova</SubmitButton>
          <div className="flex flex-wrap justify-center gap-x-7 gap-y-1">
            <TextButton onClick={() => sendCode(true)} disabled={loading}>
              Reenviar código
            </TextButton>
            <TextButton onClick={useAnotherEmail} disabled={loading}>
              Usar outro e-mail
            </TextButton>
          </div>
        </form>
      ) : null}

      {step === 'feito' ? (
        <div className="sz-card flex flex-col gap-4 p-7">
          <span
            aria-hidden="true"
            className="inline-flex size-14 items-center justify-center rounded-full bg-(--sucesso-tint) text-(--pen-ok-texto)"
          >
            <Check className="size-8" strokeWidth={2.6} />
          </span>
          <h2 ref={stepHeading} tabIndex={-1} className="sz-h2 outline-none">
            Senha nova salva
          </h2>
          <p className="m-0">
            Por segurança, saímos da sua conta nos outros aparelhos. Entre de novo com o e-mail e a
            senha nova.
          </p>
          <Link href="/login" className="sz-btn min-h-[3rem] w-full">
            Ir para entrar
          </Link>
        </div>
      ) : null}

      <LiveMessage message={announcement} />

      {step !== 'feito' ? (
        <AuthHelpLink>O código não chegou? Veja a ajuda para entrar</AuthHelpLink>
      ) : null}
    </div>
  )
}

function StepItem({
  n,
  state,
  children,
}: {
  n: number
  state: 'atual' | 'feito' | 'depois'
  children: ReactNode
}) {
  return (
    <li
      aria-current={state === 'atual' ? 'step' : undefined}
      className={cn(
        'flex min-h-14 items-center gap-2.5 rounded-[0.6rem] px-3.5 text-xs',
        state === 'atual' ? 'bg-(--acao-tint) font-bold text-foreground' : 'bg-muted',
        state === 'depois' && 'text-muted-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex size-8 flex-none items-center justify-center rounded-full font-bold',
          state === 'atual' && 'bg-primary text-primary-foreground',
          state === 'feito' && 'bg-(--pen-sucesso) text-white',
          state === 'depois' &&
            'border-2 border-[color-mix(in_oklab,var(--foreground)_30%,white)] bg-card text-muted-foreground',
        )}
      >
        {state === 'feito' ? <Check className="size-4" strokeWidth={3} /> : n}
      </span>
      <span>
        {children}
        {state === 'feito' ? <span className="sr-only"> (feito)</span> : null}
      </span>
    </li>
  )
}
