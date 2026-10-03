import type { GiftMuralAccess } from '@sistemazero/core/referrals'
import { formatTelefone } from '@sistemazero/ui/phone'
import { useEffect, useId, useRef, useState } from 'react'
import { ApiError, apiPost } from '../lib/api-fetch'

/**
 * Form de resgate do curso Cadê Todo Mundo? (landing /bolsa/<codigo>). Dados do
 * RESPONSÁVEL (a indicação é kids — mesmo aviso do pré-checkout); telefone opcional.
 * O resgate é retomável no servidor: repetir o envio após uma falha CONTINUA de
 * onde parou (mesmo e-mail), então o botão de tentar de novo é sempre seguro.
 */
export interface BolsaResgateProps {
  code: string
  referrerName: string
  communityUrl: string
  retryOnly?: boolean
}

type Phase = 'form' | 'processing' | 'done'
type Errors = Partial<Record<'nome' | 'email', string>>

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function BolsaResgate({
  code,
  referrerName,
  communityUrl,
  retryOnly = false,
}: BolsaResgateProps) {
  const [phase, setPhase] = useState<Phase>('form')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{
    email: string
    expiresAt: string | null
    emailStatus: 'accepted' | 'failed' | 'unknown'
    muralAccess?: GiftMuralAccess
  } | null>(null)
  const [alreadyRedeemed, setAlreadyRedeemed] = useState(false)
  const uid = useId()
  const inFlight = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (phase !== 'form') resultHeading.current?.focus()
  }, [phase])

  function validate(): boolean {
    const next: Errors = {}
    if (nome.trim().length < 2 || nome.trim().length > 120)
      next.nome = 'Informe o nome do responsável, com até 120 caracteres.'
    if (!EMAIL_RE.test(email.trim()) || email.trim().length > 254)
      next.email = 'Informe um e-mail válido.'
    setErrors(next)
    if (Object.keys(next).length) {
      form.current
        ?.querySelector<HTMLInputElement>(`[name="${next.nome ? 'nome' : 'email'}"]`)
        ?.focus()
    }
    return Object.keys(next).length === 0
  }

  async function resgatar() {
    if (inFlight.current || !validate()) return
    inFlight.current = true
    setSubmitting(true)
    setErroGeral(null)
    setAlreadyRedeemed(false)
    try {
      const params = new URLSearchParams(window.location.search)
      const res = await apiPost<{
        status: 'completed' | 'processing'
        expiresAt: string | null
        emailStatus: 'accepted' | 'failed' | 'unknown'
        muralAccess?: GiftMuralAccess
      }>('/api/bolsa/resgatar', {
        code,
        nome: nome.trim(),
        email: email.trim(),
        ...(telefone.trim() ? { telefone: telefone.trim() } : {}),
        attribution: {
          utmSource: params.get('utm_source'),
          utmMedium: params.get('utm_medium'),
          utmCampaign: params.get('utm_campaign'),
          utmContent: params.get('utm_content'),
        },
      })
      if (res.status === 'completed')
        setConfirmation({
          email: email.trim(),
          expiresAt: res.expiresAt,
          emailStatus: res.emailStatus,
          muralAccess: res.muralAccess,
        })
      setPhase(res.status === 'completed' ? 'done' : 'processing')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SCHOLARSHIP_ALREADY_REDEEMED') {
          setAlreadyRedeemed(true)
          setErroGeral(
            'Esse e-mail já resgatou a bolsa. Procure o e-mail de boas-vindas na sua caixa de entrada (vale olhar o spam) ou use "Esqueci minha senha" na plataforma.',
          )
        } else if (err.code === 'GIFT_EXPIRED') {
          setAlreadyRedeemed(true)
          setErroGeral(
            'Os sete dias contados do seu cadastro já terminaram. Reenviar o formulário ou recuperar a senha não reinicia esse prazo. Você pode entrar na conta para conferir os acessos que continuam disponíveis.',
          )
        } else if (err.code === 'CAMPAIGN_UNAVAILABLE') {
          setErroGeral(
            'Esta campanha não está aceitando novos cadastros agora. Se você já concluiu o cadastro, entre na plataforma com o mesmo e-mail. Seu prazo de acesso continua sendo o informado no resgate.',
          )
        } else if (err.code === 'CODE_NOT_FOUND') {
          setErroGeral('Este link de indicação não está mais ativo.')
        } else if (err.code === 'GIFT_UNAVAILABLE') {
          setErroGeral('Este presente está sendo preparado. Guarde seu link e volte em breve.')
        } else if (err.code === 'SCHOLARSHIP_FAILED') {
          setErroGeral(
            'Não conseguimos concluir o resgate para esse e-mail. Escreva para contato@sistemazero.com.br e informe o e-mail usado e este link para a equipe verificar.',
          )
        } else if (err.status === 429) {
          setErroGeral(
            'O limite de tentativas foi atingido. Aguarde alguns minutos antes de tentar novamente.',
          )
        } else {
          setErroGeral('Não foi possível concluir agora. Tente de novo em instantes.')
        }
      } else {
        setErroGeral('Não foi possível concluir agora. Confira a conexão e tente de novo.')
      }
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  if (phase === 'done') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="card rounded-2xl border-line/80 bg-card p-6 text-center sm:p-8"
      >
        <p className="text-4xl" aria-hidden="true">
          🎉
        </p>
        <h2 ref={resultHeading} tabIndex={-1} className="mt-2 text-xl font-bold text-ink">
          Curso liberado!
        </h2>
        <p className="mt-3 text-sm text-muted">
          Seu acesso ao Cadê Todo Mundo? está associado a{' '}
          <strong className="text-ink">{confirmation?.email}</strong>.
          {confirmation?.expiresAt && (
            <>
              {' '}
              O curso fica disponível até{' '}
              <strong>
                {new Date(confirmation.expiresAt).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}{' '}
                (Brasília)
              </strong>
              .
            </>
          )}
        </p>
        <p className="mt-3 text-sm text-muted">
          {confirmation?.emailStatus === 'accepted'
            ? 'As instruções estão a caminho do seu e-mail. Confira sua caixa de entrada e o spam; pode levar alguns minutos para a mensagem chegar.'
            : 'Seu acesso está liberado, mas não conseguimos confirmar o envio das instruções por e-mail. Você pode entrar com sua senha ou usar “Esqueci minha senha” para criar o acesso com o e-mail acima.'}
        </p>
        <p className="mt-3 text-sm text-muted">
          No primeiro acesso, crie o perfil da criança. Se ele já existe, escolha esse perfil e abra
          o curso em um computador. Você pode acompanhá-la para conhecerem juntos os controles e a
          primeira atividade.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-4">
          <a className="btn btn-primary" href={`${communityUrl}/login`}>
            Entrar na plataforma
          </a>
          <a className="text-sm font-bold underline" href={`${communityUrl}/esqueci-senha`}>
            Criar ou recuperar minha senha
          </a>
        </div>
        <p className="mt-4 text-xs text-muted">
          O prazo conta do cadastro e não reinicia ao trocar a senha. Este presente não gera
          cobrança.
        </p>
        <GiftMuralConfirmation access={confirmation?.muralAccess} />
      </div>
    )
  }

  if (phase === 'processing') {
    return (
      <div role="status" className="card rounded-2xl border-line/80 bg-card p-6 text-center sm:p-8">
        <h2 ref={resultHeading} tabIndex={-1} className="text-xl font-bold text-ink">
          Quase lá…
        </h2>
        <p className="mt-3 text-sm text-muted">
          Estamos finalizando o seu resgate. Aguarde alguns segundos e toque no botão abaixo.
        </p>
        <button
          type="button"
          onClick={() => {
            setPhase('form')
            void resgatar()
          }}
          className="btn btn-primary mt-5"
        >
          Concluir resgate
        </button>
      </div>
    )
  }

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void resgatar()
      }}
      className="card flex flex-col gap-4 rounded-2xl border-line/80 bg-card p-6 sm:p-8"
    >
      <p className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-ink">
        <strong>Estes dados são do responsável</strong> (mãe, pai ou tutor). O perfil da criança
        (nome e idade) você cria depois, já dentro da plataforma.
      </p>

      <div>
        <label htmlFor={`${uid}-nome`} className="mb-1.5 block text-sm font-semibold text-ink">
          Nome do responsável
        </label>
        <input
          id={`${uid}-nome`}
          name="nome"
          required
          maxLength={120}
          disabled={submitting}
          type="text"
          autoComplete="name"
          placeholder="Nome completo do responsável"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            if (errors.nome) setErrors((p) => ({ ...p, nome: undefined }))
          }}
          aria-invalid={errors.nome ? true : undefined}
          aria-describedby={errors.nome ? `${uid}-nome-error` : undefined}
          className={`w-full rounded-xl border bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan ${errors.nome ? 'border-red-400/70' : 'border-line'}`}
        />
        {errors.nome && (
          <p id={`${uid}-nome-error`} role="alert" className="mt-1.5 text-sm text-red-400">
            {errors.nome}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${uid}-email`} className="mb-1.5 block text-sm font-semibold text-ink">
          E-mail do responsável
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          required
          maxLength={254}
          disabled={submitting}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
          }}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${uid}-email-error` : undefined}
          className={`w-full rounded-xl border bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan ${errors.email ? 'border-red-400/70' : 'border-line'}`}
        />
        {errors.email && (
          <p id={`${uid}-email-error`} role="alert" className="mt-1.5 text-sm text-red-400">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${uid}-telefone`} className="mb-1.5 block text-sm font-semibold text-ink">
          Telefone <span className="font-normal text-muted">(opcional)</span>
        </label>
        <input
          id={`${uid}-telefone`}
          name="telefone"
          maxLength={20}
          disabled={submitting}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(formatTelefone(e.target.value))}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan"
        />
      </div>

      {erroGeral && (
        <p role="alert" className="text-sm text-red-400">
          {erroGeral}
        </p>
      )}
      {alreadyRedeemed && (
        <div className="flex flex-wrap gap-4">
          <a className="text-sm font-bold underline" href={`${communityUrl}/login`}>
            Entrar na plataforma
          </a>
          <a className="text-sm font-bold underline" href={`${communityUrl}/esqueci-senha`}>
            Recuperar minha senha
          </a>
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-50">
        {submitting
          ? 'Conferindo seu acesso…'
          : retryOnly
            ? 'Retomar meu cadastro'
            : 'Liberar o curso para minha família'}
      </button>
      <p className="text-center text-xs text-muted">
        Presente de {referrerName}: acesso ao curso Cadê Todo Mundo? sem custo e sem cartão, por 7
        dias a partir do cadastro pelo link. Nesse período, seu filho pode publicar o jogo do curso,
        comentar e reagir no Mural dos Criadores. Depois, continua podendo ver e jogar enquanto a
        conta existir. O link do jogo publicado continua funcionando enquanto a publicação estiver
        disponível. Ferramentas de criação livre e cópias de jogos não estão incluídas.
      </p>
      <p className="text-center text-xs text-muted">
        Ao continuar, você confirma que é o responsável pela criança e aceita os{' '}
        <a href="/kids/termos" className="underline">
          Termos de Uso
        </a>
        . Veja como tratamos seus dados na{' '}
        <a href="/kids/privacidade" className="underline">
          Política de Privacidade
        </a>
        .
      </p>
    </form>
  )
}

/** Evita anunciar a participação nova para resgates antigos retomados. */
export function GiftMuralConfirmation({ access }: { access?: GiftMuralAccess }) {
  if (access === 'trial')
    return (
      <p className="mt-3 text-sm text-muted">
        Até o vencimento informado acima, seu filho também pode publicar o jogo do curso, comentar e
        reagir no Mural. A aula 2 ensina como publicar. Depois, vocês continuam podendo ver e jogar
        enquanto a conta existir. O link do jogo publicado continua funcionando enquanto a
        publicação estiver disponível.
      </p>
    )
  if (access === 'visitor')
    return (
      <p className="mt-3 text-sm text-muted">
        Seu resgate inclui a visita ao Mural para ver e jogar enquanto a conta existir. Essa
        modalidade não libera publicar, comentar ou reagir.
      </p>
    )
  return null
}
