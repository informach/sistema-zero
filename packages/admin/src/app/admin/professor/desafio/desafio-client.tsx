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
import { Plus, RotateCcw, Trophy } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { monthLabelPt } from '@/lib/dates'
import type {
  ChallengeMonthAdminView,
  ChallengeThemeAdminView,
  ChallengeThemesAdminView,
  ChallengeThemeView,
} from '@/lib/types'

/**
 * Desafio do mês (game jam kids): o professor vê o tema valendo em cada mês
 * (definido por ele ou SORTEADO como fallback — todo mês sempre tem tema),
 * altera um mês, volta ao sorteio e mantém a biblioteca de temas. Trocar o
 * tema NÃO afeta participação/XP das crianças: a tag do desafio é o MÊS.
 */
export function DesafioClient() {
  const [months, setMonths] = useState<ChallengeMonthAdminView[] | null>(null)
  const [themes, setThemes] = useState<ChallengeThemesAdminView | null>(null)
  const [editingMonth, setEditingMonth] = useState<ChallengeMonthAdminView | null>(null)
  const [themeForm, setThemeForm] = useState<ChallengeThemeAdminView | 'new' | null>(null)
  const { confirm, confirmDialog } = useConfirm()

  const reload = useCallback(async () => {
    try {
      const [m, t] = await Promise.all([
        apiGet<{ months: ChallengeMonthAdminView[] }>('/api/members/challenge/months'),
        apiGet<ChallengeThemesAdminView>('/api/members/challenge/themes'),
      ])
      setMonths(m.months)
      setThemes(t)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui carregar o desafio.')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function clearMonth(m: ChallengeMonthAdminView) {
    confirm({
      title: 'Voltar ao sorteio?',
      message: m.current
        ? `O mês no ar (${monthLabelPt(m.month)}) voltará ao tema sorteado. As crianças já podem ter começado com o tema atual; a participação delas não é afetada.`
        : `${monthLabelPt(m.month)} voltará ao tema sorteado automaticamente.`,
      confirmText: 'Voltar ao sorteio',
      onConfirm: async () => {
        try {
          await apiSend(`/api/members/challenge/months/${m.month}`, 'DELETE')
          toast.success(`${monthLabelPt(m.month)} voltou ao sorteio.`)
          await reload()
        } catch (err) {
          toast.error((err as ApiError).message ?? 'Não consegui voltar ao sorteio.')
        }
      },
    })
  }

  const loading = !months || !themes

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Desafio do mês"
        description="Cada mês sempre tem um tema: o sorteio automático garante isso. Defina um tema quando quiser dirigir a game jam."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {months.map((m) => (
                <div
                  key={m.monthKey}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${
                    m.current ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="w-44 shrink-0">
                    <p className="font-semibold capitalize">{monthLabelPt(m.month)}</p>
                    {m.current ? (
                      <Badge className="mt-1">
                        <Trophy className="mr-1 size-3" /> No ar agora
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden className="text-2xl">
                      {m.theme.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.theme.title}</p>
                      <p className="truncate text-muted-foreground text-xs">
                        {m.theme.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={m.source === 'definido' ? 'default' : 'muted'}>
                      {m.source === 'definido' ? 'Definido' : 'Sorteado'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setEditingMonth(m)}>
                      Alterar
                    </Button>
                    {m.source === 'definido' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => clearMonth(m)}
                        title="Voltar ao sorteio"
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Biblioteca de temas</h2>
                <p className="text-muted-foreground text-sm">
                  Os 12 temas fixos participam do sorteio. Os seus temas só entram quando você
                  define um mês com eles.
                </p>
              </div>
              <Button onClick={() => setThemeForm('new')}>
                <Plus className="mr-1 size-4" /> Novo tema
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          confirm({
                            title: t.archived ? 'Reativar tema?' : 'Arquivar tema?',
                            message: t.archived
                              ? `"${t.title}" volta a aparecer na escolha de temas.`
                              : `"${t.title}" sai da lista de escolha. Um mês já definido com ele continua valendo.`,
                            confirmText: t.archived ? 'Reativar' : 'Arquivar',
                            onConfirm: async () => {
                              try {
                                await apiSend(`/api/members/challenge/themes/${t.id}`, 'PATCH', {
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
                      >
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
        </>
      )}

      {editingMonth && themes ? (
        <ChangeMonthDialog
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
          <p className="mt-1 text-muted-foreground text-xs">Kit sugerido: {theme.suggestedKit}</p>
        </div>
        {actions}
      </CardContent>
    </Card>
  )
}

/** Escolha do tema de UM mês: fixos + custom ativos, com aviso p/ o mês no ar. */
function ChangeMonthDialog({
  month,
  themes,
  onClose,
  onSaved,
}: {
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
      await apiSend(`/api/members/challenge/months/${month.month}`, 'PUT', body)
      toast.success(`Tema de ${monthLabelPt(month.month)} definido.`)
      await onSaved()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui definir o tema.')
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
            {month.current ? 'Trocar o tema no ar' : 'Definir tema'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {month.current ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            Este é o mês no ar: as crianças já podem ter começado com o tema atual. A participação
            delas não é afetada (a tag do desafio é o mês, não o tema).
          </p>
        ) : null}
        <Field label="Tema">
          <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="" disabled>
              Escolha um tema…
            </option>
            {activeCustom.length > 0 ? (
              <optgroup label="Meus temas">
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
            <p className="mt-1 text-muted-foreground text-xs">
              Kit sugerido: {selected.suggestedKit}
            </p>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}

/** Criar/editar tema custom (todos os campos obrigatórios: o card kids mostra tudo). */
function ThemeFormDialog({
  theme,
  onClose,
  onSaved,
}: {
  theme: ChallengeThemeAdminView | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [emoji, setEmoji] = useState(theme?.emoji ?? '')
  const [title, setTitle] = useState(theme?.title ?? '')
  const [description, setDescription] = useState(theme?.description ?? '')
  const [suggestedKit, setSuggestedKit] = useState(theme?.suggestedKit ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!emoji.trim() || !title.trim() || !description.trim() || !suggestedKit.trim()) {
      toast.error('Preencha emoji, título, descrição e kit sugerido.')
      return
    }
    setSaving(true)
    const body = {
      emoji: emoji.trim(),
      title: title.trim(),
      description: description.trim(),
      suggestedKit: suggestedKit.trim(),
    }
    try {
      if (theme) {
        await apiSend(`/api/members/challenge/themes/${theme.id}`, 'PATCH', body)
        toast.success('Tema atualizado.')
      } else {
        await apiSend('/api/members/challenge/themes', 'POST', body)
        toast.success('Tema criado. Defina um mês com ele quando quiser.')
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
      description="A criança vê emoji, título, descrição e a dica do kit no card do desafio."
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
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🎄" />
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
        <Field label="Descrição" hint="Um convite curto, direto para a criança">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Crie um jogo natalino: presentes, trenós ou uma guerra de bolas de neve."
            rows={3}
            maxLength={300}
          />
        </Field>
        <Field label="Kit sugerido" hint="Kit do Estúdio que combina com o tema">
          <Input
            value={suggestedKit}
            onChange={(e) => setSuggestedKit(e.target.value)}
            placeholder="Jogo 2D"
            maxLength={60}
          />
        </Field>
      </div>
    </Dialog>
  )
}
