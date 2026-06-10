'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Spinner } from '@sistemazero/ui/spinner'
import { StarRating, type StarRatingValue } from '@sistemazero/ui/star-rating'
import { Textarea } from '@sistemazero/ui/textarea'
import { Share2, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiSend } from '@/lib/api'
import type {
  CourseFeedbackAnswer,
  CourseFeedbackAnswers,
  CourseFeedbackQuestionKey,
  CourseRatingView,
} from '@/lib/types'
import { getUserDisplayName } from '@/lib/user-display'

/** Dados do aluno exibidos no passo de agradecimento (avatar + nome). */
export interface RatingViewer {
  firstName: string | null
  lastName: string | null
  email: string | null
  avatarUrl: string | null
}

interface Props {
  courseSlug: string
  /** Classificação já feita (servidor) — não-nula esconde o link. */
  initialRating: CourseRatingView | null
  /** URL da página de vendas (compartilhar) — `null` esconde o botão Compartilhar. */
  shareUrl: string | null
  viewer: RatingViewer
}

type Step = 1 | 2 | 3 | 4 | 5

const TITLES: Record<Step, string> = {
  1: 'Como você classificaria este curso?',
  2: 'Por que deixou esta classificação?',
  3: 'Conte-nos mais (opcional).',
  4: 'Obrigado por ajudar nossa comunidade!',
  5: 'Compartilhar este curso',
}

/** Perguntas fixas do passo opcional — chaves espelham o members (domain/rating). */
const QUESTIONS: { key: CourseFeedbackQuestionKey; label: string }[] = [
  { key: 'importantInfo', label: 'Você está obtendo informações importantes?' },
  { key: 'clearExplanations', label: 'As explicações dos conceitos são claras?' },
  { key: 'engagingInstructor', label: 'A apresentação do instrutor é cativante?' },
  {
    key: 'enoughPractice',
    label: 'Há oportunidades suficientes para aplicar o que você está aprendendo?',
  },
  { key: 'meetsExpectations', label: 'O curso está atendendo a suas expectativas?' },
  { key: 'knowledgeable', label: 'O instrutor entende do assunto?' },
]

const ANSWER_OPTIONS: { value: CourseFeedbackAnswer; label: string }[] = [
  { value: 'yes', label: 'Sim' },
  { value: 'no', label: 'Não' },
  { value: 'unsure', label: 'Não sei' },
]

/** Frase do passo 2, variando com a nota (estilo Udemy). */
function ratingHeadline(rating: number): string {
  if (rating <= 1.5) return 'Terrível, não era o que eu esperava'
  if (rating <= 2.5) return 'Fraco, não era o que eu esperava'
  if (rating <= 3.5) return 'Na média'
  if (rating <= 4.5) return 'Bom, era o que eu esperava'
  return 'Incrível, acima do esperado'
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback p/ contextos sem Clipboard API (ex.: http em dev na rede local).
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      el.remove()
      return ok
    } catch {
      return false
    }
  }
}

/**
 * Link "Deixe uma classificação" + fluxo de modais em 5 passos (estilo Udemy):
 * estrelas (meia estrela) → justificativa → perguntas opcionais → agradecimento
 * → compartilhar. CADA passo persiste o estado ACUMULADO (fechar no meio não
 * perde nada); assim que a nota é salva, o aluno "já classificou" e o link some.
 */
export function CourseRatingFlow({ courseSlug, initialRating, shareUrl, viewer }: Props) {
  const router = useRouter()
  const [hasRated, setHasRated] = useState(initialRating != null)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [answers, setAnswers] = useState<CourseFeedbackAnswers>({})
  const [saving, setSaving] = useState(false)

  /** Sempre envia o estado ACUMULADO (overrides cobrem o setState assíncrono). */
  async function persist(overrides?: {
    rating?: number
    answers?: CourseFeedbackAnswers
  }): Promise<boolean> {
    const r = overrides?.rating ?? rating
    const a = overrides?.answers ?? answers
    setSaving(true)
    try {
      await apiSend(`/api/members/courses/${encodeURIComponent(courseSlug)}/rating`, 'PUT', {
        rating: r,
        comment: comment.trim() || null,
        feedbackAnswers: Object.keys(a).length > 0 ? a : null,
      })
      return true
    } catch {
      toast.error('Não foi possível salvar sua classificação. Tente de novo.')
      return false
    } finally {
      setSaving(false)
    }
  }

  /** Passo 1: clicar numa nota já persiste (a partir daqui, "já classificou"). */
  async function selectRating(value: StarRatingValue) {
    setRating(value)
    if (await persist({ rating: value })) {
      setHasRated(true)
      setStep(2)
    }
  }

  async function saveComment() {
    if (await persist()) setStep(3)
  }

  async function saveFeedback() {
    if (await persist({ answers })) setStep(4)
  }

  function toggleAnswer(key: CourseFeedbackQuestionKey, value: CourseFeedbackAnswer) {
    setAnswers((prev) => {
      const next = { ...prev }
      if (next[key] === value) delete next[key]
      else next[key] = value
      return next
    })
  }

  function close() {
    setOpen(false)
    // Tudo já foi salvo passo a passo; o refresh sincroniza o myRating do servidor.
    if (hasRated) router.refresh()
  }

  async function copyShareUrl() {
    if (!shareUrl) return
    const ok = await copyToClipboard(shareUrl)
    if (ok) toast.success('Link copiado!')
    else toast.error('Não foi possível copiar o link.')
  }

  const back: Partial<Record<Step, () => void>> = {
    2: () => setStep(1),
    3: () => setStep(2),
    4: () => setStep(3),
    5: () => setStep(4),
  }

  const footer =
    step === 2 ? (
      <Button onClick={saveComment} disabled={saving}>
        {saving ? <Spinner /> : null}
        Salvar e continuar
      </Button>
    ) : step === 3 ? (
      <>
        <Button variant="ghost" onClick={() => setStep(4)} disabled={saving}>
          Pular
        </Button>
        <Button onClick={saveFeedback} disabled={saving}>
          {saving ? <Spinner /> : null}
          Salvar e continuar
        </Button>
      </>
    ) : step === 4 ? (
      <Button onClick={close}>Salvar e sair</Button>
    ) : undefined

  return (
    <>
      {!hasRated ? (
        <button
          type="button"
          onClick={() => {
            setStep(1)
            setOpen(true)
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-interactive transition-colors hover:text-interactive-hover"
        >
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          Deixe uma classificação
        </button>
      ) : null}

      <Dialog
        open={open}
        onClose={close}
        title={TITLES[step]}
        titleAlign="center"
        onBack={back[step]}
        footer={footer}
      >
        {step === 1 ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm font-semibold">Selecionar classificação</p>
            <StarRating value={rating} onChange={selectRating} size="lg" />
            {saving ? <Spinner /> : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-semibold">{ratingHeadline(rating)}</p>
            <StarRating value={rating} onChange={(v) => setRating(v)} />
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte-nos sobre sua experiência pessoal neste curso. Era o que você esperava?"
              rows={5}
              maxLength={5000}
              className="w-full"
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            {QUESTIONS.map((q) => (
              <div key={q.key} className="flex flex-col gap-2">
                <p className="text-sm font-medium">{q.label}</p>
                <div className="flex gap-2">
                  {ANSWER_OPTIONS.map((o) => (
                    <Button
                      key={o.value}
                      size="sm"
                      variant={answers[q.key] === o.value ? 'default' : 'outline'}
                      onClick={() => toggleAnswer(q.key, o.value)}
                    >
                      {o.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3 border-y border-border py-4">
              <UserAvatar
                avatarUrl={viewer.avatarUrl}
                firstName={viewer.firstName}
                lastName={viewer.lastName}
                email={viewer.email}
                size="lg"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium">
                  {getUserDisplayName(viewer.firstName, viewer.lastName, viewer.email)}
                </p>
                <StarRating value={rating} size="sm" />
                {comment.trim() ? (
                  <p className="text-sm text-muted-foreground">{comment.trim()}</p>
                ) : null}
              </div>
            </div>
            {shareUrl ? (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setStep(5)}>
                  Compartilhar
                  <Share2 className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={shareUrl ?? ''}
              className="flex-1"
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Link da página do curso"
            />
            <Button onClick={copyShareUrl}>Copiar</Button>
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
