'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Spinner } from '@sistemazero/ui/spinner'
import { Pencil, Sparkles, Trophy } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { KidsAvatar } from '@/components/kids/kids-avatar'
import { apiSend } from '@/lib/api'
import type { AvatarConfig } from '@/lib/avatar-catalog'
import type { ProfileView } from '@/lib/types'

// O editor puxa o DiceBear (`@dicebear/collection`) — carrega só sob demanda (sem SSR).
const AvatarEditor = dynamic(
  () => import('@/components/kids/avatar-editor').then((m) => m.AvatarEditor),
  { ssr: false },
)

/** Colocação no ranking kids (XP) — `null` = gamificação indisponível (esconde a linha). */
export interface RankingInfo {
  position: number
  totalStudents: number
}

// Edição do PRÓPRIO perfil (não da conta): nome (mín. 3, espelha o auth) + telefone.
// O AVATAR é montado por camadas (guarda-roupa) — não há mais upload de foto.
// E-mail/senha são da CONTA e vivem na Área dos pais — não aqui.
const ProfileSchema = z.object({
  name: z.string().trim().min(3, 'O nome precisa de ao menos 3 letras').max(60),
  whatsapp: z.string().trim().max(20),
})

/**
 * Perfil kids (sessão de perfil): 1 card de identidade — avatar CLICÁVEL (abre o
 * guarda-roupa por camadas) + nome + colocação no ranking — e o botão "Editar perfil"
 * abre o modal com nome e telefone DO PERFIL. A criança nunca toca na conta do responsável.
 */
export function ProfileClient({
  profile,
  ranking,
  avatarConfig,
}: {
  profile: ProfileView
  ranking: RankingInfo | null
  avatarConfig: AvatarConfig | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [customizing, setCustomizing] = useState(false)

  return (
    <>
      <IdentityCard
        profile={profile}
        ranking={ranking}
        avatarConfig={avatarConfig}
        onEdit={() => setEditing(true)}
        onCustomize={() => setCustomizing(true)}
      />
      <Dialog open={editing} onClose={() => setEditing(false)} title="Editar perfil">
        <ProfileForm profile={profile} onDone={() => setEditing(false)} />
      </Dialog>
      {customizing ? (
        <AvatarEditor
          onClose={() => {
            setCustomizing(false)
            router.refresh() // re-busca o avatar equipado p/ o card/chrome
          }}
        />
      ) : null}
    </>
  )
}

function IdentityCard({
  profile,
  ranking,
  avatarConfig,
  onEdit,
  onCustomize,
}: {
  profile: ProfileView
  ranking: RankingInfo | null
  avatarConfig: AvatarConfig | null
  onEdit: () => void
  onCustomize: () => void
}) {
  return (
    <Card>
      {/* Sem CardHeader: o pt-0 default do CardContent deixaria o card sem topo. */}
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-5">
          {/* Clicar no avatar abre o guarda-roupa (único caminho de personalização). */}
          <button
            type="button"
            aria-label="Personalizar avatar"
            title="Personalizar avatar"
            onClick={onCustomize}
            className="group relative shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <KidsAvatar config={avatarConfig} size="xl" label={`Avatar de ${profile.name}`} />
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <Sparkles className="size-6 text-white" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{profile.name}</p>
            {profile.whatsapp ? (
              <p className="truncate text-muted-foreground text-sm">{profile.whatsapp}</p>
            ) : null}
            {ranking ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm">
                <Trophy className="size-4 shrink-0 text-primary" />
                <span className="font-bold [font-family:var(--font-display)]">
                  {ranking.position}º lugar
                </span>
                <span className="text-muted-foreground">
                  no ranking{ranking.totalStudents ? ` de ${ranking.totalStudents}` : ''}
                </span>
              </p>
            ) : (
              // Sem colocação ainda (sem XP / vitrine sem ranking) → convite, não vazio.
              <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground text-sm">
                <Trophy className="size-4 shrink-0" />
                <span>Continue praticando para entrar no ranking!</span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={onCustomize}>
              <Sparkles className="size-4" />
              Personalizar avatar
            </Button>
            <Button type="button" variant="outline" onClick={onEdit}>
              <Pencil className="size-4" />
              Editar perfil
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileForm({ profile, onDone }: { profile: ProfileView; onDone: () => void }) {
  const router = useRouter()
  const [name, setName] = useState(profile.name)
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = ProfileSchema.safeParse({ name, whatsapp })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message
      setErrors(next)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      // Telefone vazio → `null` (remove); a borda do auth aceita ambos.
      await apiSend(`/api/profiles/${profile.id}`, 'PATCH', {
        name: parsed.data.name,
        whatsapp: parsed.data.whatsapp.length > 0 ? parsed.data.whatsapp : null,
      })
      toast.success('Perfil atualizado!')
      router.refresh()
      onDone()
    } catch {
      toast.error('Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Nome" htmlFor="profileName" error={errors.name}>
        <Input
          id="profileName"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
      </Field>
      <Field label="Telefone" htmlFor="profileWhatsapp" error={errors.whatsapp}>
        <Input
          id="profileWhatsapp"
          value={whatsapp}
          maxLength={20}
          inputMode="tel"
          placeholder="Opcional"
          onChange={(e) => setWhatsapp(e.target.value)}
          aria-invalid={Boolean(errors.whatsapp)}
        />
      </Field>
      <Button type="submit" disabled={saving} className="self-start">
        {saving ? <Spinner /> : null}
        Salvar
      </Button>
    </form>
  )
}
