'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { Plus, Trophy } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { LoadError } from '@/components/admin/empty-state'
import { usePlatform } from '@/components/admin/platform-provider'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { monthLabelPt } from '@/lib/dates'
import type {
  ChallengeMonthAdminView,
  ChallengeThemeAdminView,
  ChallengeThemesAdminView,
  ChallengeThemeView,
} from '@/lib/types'

/**
 * Desafio do mês (game jam): a equipe vê o tema valendo em cada mês (escolhido por ela ou
 * SORTEADO como reserva: todo mês sempre tem tema), troca um mês, volta ao sorteio e mantém a
 * biblioteca de temas. Trocar o tema NÃO afeta participação/XP: a tag do desafio é o MÊS.
 *
 * Os meses são uma grade de cartões (a sala da equipe, 23/10/2026): o mês no ar é o cartão
 * escuro, e a biblioteca fica numa coluna ao lado em telas largas.
 */
export function DesafioClient() {
  const platform = usePlatform()
  return <DesafioForPlatform key={platform} platform={platform} />
}
function DesafioForPlatform({ platform }: { platform: 'kids' | 'adult' }) {
  const [months, setMonths] = useState<ChallengeMonthAdminView[] | null>(null)
  const [themes, setThemes] = useState<ChallengeThemesAdminView | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [editingMonth, setEditingMonth] = useState<ChallengeMonthAdminView | null>(null)
  const [themeForm, setThemeForm] = useState<ChallengeThemeAdminView | 'new' | null>(null)
  const { confirm, confirmDialog } = useConfirm()

  const reload = useCallback(async () => {
    setLoadFailed(false)
    try {
      const [m, t] = await Promise.all([
        apiGet<{ months: ChallengeMonthAdminView[] }>(
          `/api/members/challenge/months?audience=${platform}`,
        ),
        apiGet<ChallengeThemesAdminView>(`/api/members/challenge/themes?audience=${platform}`),
      ])
      setMonths(m.months)
      setThemes(t)
    } catch (err) {
      // Sem dados ainda, a tela mostra o LoadError; com dados, eles ficam e o toast avisa.
      setLoadFailed(true)
      toast.error((err as ApiError).message ?? 'Não consegui carregar o desafio.')
    }
  }, [platform])

  useEffect(() => {
    void reload()
  }, [reload])

  async function clearMonth(m: ChallengeMonthAdminView) {
    confirm({
      title: 'Voltar ao sorteio?',
      message: m.current
        ? `O mês no ar (${monthLabelPt(m.month)}) volta ao tema sorteado. ${
            platform === 'kids' ? 'As crianças' : 'Os alunos'
          } já podem ter começado com o tema atual, e a participação não muda.`
        : `${monthLabelPt(m.month)} volta ao tema sorteado.`,
      confirmText: 'Voltar ao sorteio',
      onConfirm: async () => {
        try {
          await apiSend(`/api/members/challenge/months/${m.month}?audience=${platform}`, 'DELETE')
          toast.success(`${monthLabelPt(m.month)} voltou ao sorteio.`)
          await reload()
        } catch (err) {
          toast.error((err as ApiError).message ?? 'Não consegui voltar ao sorteio.')
        }
      },
    })
  }

  function toggleArchive(t: ChallengeThemeAdminView) {
    confirm({
      title: t.archived ? 'Reativar o tema?' : 'Arquivar o tema?',
      message: t.archived
        ? `"${t.title}" volta a aparecer na escolha de temas.`
        : `"${t.title}" sai da lista de escolha. Um mês que já usa esse tema continua com ele.`,
      confirmText: t.archived ? 'Reativar' : 'Arquivar',
      onConfirm: async () => {
        try {
          await apiSend(`/api/members/challenge/themes/${t.id}?audience=${platform}`, 'PATCH', {
            archived: !t.archived,
          })
          toast.success(t.archived ? 'Tema reativado.' : 'Tema arquivado.')
          await reload()
        } catch (err) {
          toast.error((err as ApiError).message ?? 'Não consegui salvar.')
        }
      },
    })
  }

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Desafio do mês"
        description="Todo mês tem um tema. Se ninguém escolher, o sorteio escolhe sozinho. Escolha quando quiser dirigir a game jam."
      />

      {!months || !themes ? (
        loadFailed ? (
          <LoadError what="o desafio do mês" onRetry={() => void reload()} />
        ) : (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" />
          </div>
        )
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="min-w-0 space-y-3" aria-labelledby="desafio-meses">
            <h2 id="desafio-meses" className="font-display text-xl font-bold">
              Os meses
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {months.map((m) => (
                <li
                  key={m.monthKey}
                  aria-current={m.current ? 'date' : undefined}
                  className={cn(
                    'flex flex-col gap-4 rounded-[18px] border p-5',
                    m.current
                      ? 'border-transparent bg-menu text-menu-text'
                      : 'border-border bg-card',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p
                      className={cn(
                        'font-display text-lg font-bold capitalize',
                        m.current && 'text-white',
                      )}
                    >
                      {monthLabelPt(m.month)}
                    </p>
                    {m.current ? (
                      <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-lens-kids px-3 text-[13px] font-bold text-lens-kids-ink">
                        <Trophy className="size-3.5" aria-hidden /> No ar agora
                      </span>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span aria-hidden className="text-3xl leading-none">
                      {m.theme.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className={cn('font-bold', m.current && 'text-white')}>{m.theme.title}</p>
                      <p
                        className={cn(
                          'text-sm',
                          m.current ? 'text-menu-text' : 'text-muted-foreground',
                        )}
                      >
                        {m.theme.description}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Badge variant={m.source === 'definido' ? 'default' : 'muted'}>
                      {m.source === 'definido' ? 'Escolhido pela equipe' : 'Sorteado'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={m.current ? 'secondary' : 'outline'}
                      className="h-11 px-4"
                      onClick={() => setEditingMonth(m)}
                    >
                      Escolher o tema
                    </Button>
                    {m.source === 'definido' ? (
                      <Button
                        variant={m.current ? 'secondary' : 'ghost'}
                        className="h-11 px-4"
                        onClick={() => clearMonth(m)}
                      >
                        Voltar ao sorteio
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="min-w-0 space-y-3" aria-labelledby="desafio-biblioteca">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="desafio-biblioteca" className="font-display text-xl font-bold">
                  Biblioteca de temas
                </h2>
                <Button onClick={() => setThemeForm('new')}>
                  <Plus className="size-4" /> Novo tema
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">
                Os 12 temas fixos entram no sorteio. Os temas da equipe só valem no mês em que
                alguém escolhe um deles.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {themes.custom.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  archived={t.archived}
                  actions={
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setThemeForm(t)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleArchive(t)}>
                        {t.archived ? 'Reativar' : 'Arquivar'}
                      </Button>
                    </div>
                  }
                />
              ))}
              {themes.builtin.map((t) => (
                <ThemeCard key={t.slug} theme={t} fixed />
              ))}
            </div>
          </section>
        </div>
      )}

      {editingMonth && themes ? (
        <ChangeMonthDialog
          platform={platform}
          month={editingMonth}
          themes={themes}
          onClose={() => setEditingMonth(null)}
          onSaved={async () => {
            setEditingMonth(null)
            await reload()
          }}
        />
      ) : null}

      {themeForm ? (
        <ThemeFormDialog
          platform={platform}
          theme={themeForm === 'new' ? null : themeForm}
          onClose={() => setThemeForm(null)}
          onSaved={async () => {
            setThemeForm(null)
            await reload()
          }}
        />
      ) : null}

      {confirmDialog}
    </div>
  )
}

function ThemeCard({
  theme,
  fixed = false,
  archived = false,
  actions,
}: {
  theme: ChallengeThemeView | ChallengeThemeAdminView
  fixed?: boolean
  archived?: boolean
  actions?: React.ReactNode
}) {
  return (
    <Card className={archived ? 'opacity-60' : undefined}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <span aria-hidden className="text-3xl">
            {theme.emoji}
          </span>
          {fixed ? (
            <Badge variant="muted">Fixo</Badge>
          ) : archived ? (
            <Badge variant="outline">Arquivado</Badge>
          ) : null}
        </div>
        <div>
          <p className="font-semibold">{theme.title}</p>
          <p className="text-muted-foreground text-sm">{theme.description}</p>
        </div>
        {actions}
      </CardContent>
    </Card>
  )
}

/** Escolha do tema de UM mês: fixos + custom ativos, com aviso p/ o mês no ar. */
function ChangeMonthDialog({
  platform,
  month,
  themes,
  onClose,
  onSaved,
}: {
  platform: 'kids' | 'adult'
  month: ChallengeMonthAdminView
  themes: ChallengeThemesAdminView
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const activeCustom = themes.custom.filter((t) => !t.archived)
  const initial =
    month.source === 'definido'
      ? month.customThemeId
        ? `custom:${month.customThemeId}`
        : `builtin:${month.theme.slug}`
      : ''
  const [choice, setChoice] = useState(initial)
  const [saving, setSaving] = useState(false)

  const selected: ChallengeThemeView | undefined = choice.startsWith('builtin:')
    ? themes.builtin.find((t) => t.slug === choice.slice(8))
    : choice.startsWith('custom:')
      ? activeCustom.find((t) => t.id === choice.slice(7))
      : undefined

  async function save() {
    if (!choice) {
      toast.error('Escolha um tema.')
      return
    }
    setSaving(true)
    try {
      const body = choice.startsWith('builtin:')
        ? { builtinSlug: choice.slice(8) }
        : { customThemeId: choice.slice(7) }
      await apiSend(
        `/api/members/challenge/months/${month.month}?audience=${platform}`,
        'PUT',
        body,
      )
      toast.success(`Tema de ${monthLabelPt(month.month)} escolhido.`)
      await onSaved()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui escolher o tema.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Tema de ${monthLabelPt(month.month)}`}
      description={
        month.source === 'sorteio'
          ? `Hoje este mês usa o tema sorteado: ${month.theme.emoji} ${month.theme.title}.`
          : undefined
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || !choice}>
            {saving ? <Spinner className="mr-2 size-4" /> : null}
            {month.current ? 'Trocar o tema no ar' : 'Escolher este tema'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {month.current ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            Este é o mês no ar: {platform === 'kids' ? 'as crianças' : 'os alunos'} já podem ter
            começado com o tema atual. A participação não muda, porque ela conta pelo mês, e não
            pelo tema.
          </p>
        ) : null}
        <Field label="Tema">
          <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="" disabled>
              Escolha um tema…
            </option>
            {activeCustom.length > 0 ? (
              <optgroup label="Temas da equipe">
                {activeCustom.map((t) => (
                  <option key={t.id} value={`custom:${t.id}`}>
                    {t.emoji} {t.title}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Temas fixos">
              {themes.builtin.map((t) => (
                <option key={t.slug} value={`builtin:${t.slug}`}>
                  {t.emoji} {t.title}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
        {selected ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="font-medium">
              {selected.emoji} {selected.title}
            </p>
            <p className="text-muted-foreground text-sm">{selected.description}</p>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}

/** Criar/editar tema custom (emoji, título e descrição: o que o card do desafio mostra). */
function ThemeFormDialog({
  platform,
  theme,
  onClose,
  onSaved,
}: {
  platform: 'kids' | 'adult'
  theme: ChallengeThemeAdminView | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [emoji, setEmoji] = useState(theme?.emoji ?? '')
  const [title, setTitle] = useState(theme?.title ?? '')
  const [description, setDescription] = useState(theme?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!emoji.trim() || !title.trim() || !description.trim()) {
      toast.error('Preencha emoji, título e descrição.')
      return
    }
    setSaving(true)
    const body = {
      emoji: emoji.trim(),
      title: title.trim(),
      description: description.trim(),
    }
    try {
      if (theme) {
        await apiSend(
          `/api/members/challenge/themes/${theme.id}?audience=${platform}`,
          'PATCH',
          body,
        )
        toast.success('Tema atualizado.')
      } else {
        await apiSend(`/api/members/challenge/themes?audience=${platform}`, 'POST', body)
        toast.success('Tema criado. Escolha um mês para ele quando quiser.')
      }
      await onSaved()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui salvar o tema.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={theme ? 'Editar tema' : 'Novo tema'}
      description={`${platform === 'kids' ? 'A criança' : 'O aluno'} vê o emoji, o título e a descrição no cartão do desafio.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner className="mr-2 size-4" /> : null}
            {theme ? 'Salvar' : 'Criar tema'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[6rem_1fr] gap-3">
          <Field label="Emoji" hint="Um só">
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" />
          </Field>
          <Field label="Título">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Natal dos criadores"
              maxLength={80}
            />
          </Field>
        </div>
        <Field
          label="Descrição"
          hint={`Um convite curto, direto para ${platform === 'kids' ? 'a criança' : 'o aluno'}`}
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Crie um jogo natalino: presentes, trenós ou uma guerra de bolas de neve."
            rows={3}
            maxLength={300}
          />
        </Field>
      </div>
    </Dialog>
  )
}
