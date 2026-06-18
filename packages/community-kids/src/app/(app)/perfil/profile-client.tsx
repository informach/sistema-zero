'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Spinner } from '@sistemazero/ui/spinner'
import { Camera, Pencil, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { apiSend } from '@/lib/api'
import type { ProfileView } from '@/lib/types'

const AVATAR_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const AVATAR_MAX_BYTES = 5 * 1024 * 1024 // 5MB (mesma régua do servidor)

/** Colocação no ranking kids (XP) — `null` = gamificação indisponível (esconde a linha). */
export interface RankingInfo {
  position: number
  totalStudents: number
}

// Edição do PRÓPRIO perfil (não da conta): nome (mín. 3, espelha o auth) + telefone.
// A foto é o caminho clicável separado (upload multipart). E-mail/senha são da CONTA
// e vivem na Área dos pais (`/perfis`, sessão do responsável) — não aqui.
const ProfileSchema = z.object({
  name: z.string().trim().min(3, 'O nome precisa de ao menos 3 letras').max(60),
  whatsapp: z.string().trim().max(20),
})

/**
 * Perfil kids (sessão de perfil): 1 card de identidade — foto CLICÁVEL (único
 * caminho de troca) + nome + colocação no ranking — e o botão "Editar perfil" abre
 * o modal com nome e telefone DO PERFIL. Tudo PATCHa `/api/profiles/:id`; a criança
 * nunca toca na conta do responsável.
 */
export function ProfileClient({
  profile,
  ranking,
}: {
  profile: ProfileView
  ranking: RankingInfo | null
}) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      <IdentityCard profile={profile} ranking={ranking} onEdit={() => setEditing(true)} />
      <Dialog open={editing} onClose={() => setEditing(false)} title="Editar perfil">
        <ProfileForm profile={profile} onDone={() => setEditing(false)} />
      </Dialog>
    </>
  )
}

function IdentityCard({
  profile,
  ranking,
  onEdit,
}: {
  profile: ProfileView
  ranking: RankingInfo | null
  onEdit: () => void
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-selecionar o mesmo arquivo
    if (!file) return
    if (!AVATAR_MIME_TYPES.has(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WebP.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('A foto deve ter no máximo 5MB.')
      return
    }

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)
    try {
      const form = new FormData()
      form.set('file', file)
      // Foto DO PERFIL (não da conta): `/api/profiles/:id/avatar`.
      const res = await fetch(`/api/profiles/${profile.id}/avatar`, { method: 'POST', body: form })
      const data = (await res.json().catch(() => null)) as {
        url?: string
        error?: { message?: string }
      } | null
      if (!res.ok) {
        setPreview(null)
        toast.error(data?.error?.message ?? 'Não foi possível enviar a foto.')
        return
      }
      // Troca o blob LOCAL (revogado no finally) pela URL do servidor — evita exibir
      // um object URL morto até o router.refresh() trazer o perfil novo.
      setPreview(data?.url ?? null)
      toast.success('Foto atualizada!')
      router.refresh()
    } catch {
      setPreview(null)
      toast.error('Falha de rede. Tente novamente.')
    } finally {
      setUploading(false)
      URL.revokeObjectURL(localUrl)
    }
  }

  return (
    <Card>
      {/* Sem CardHeader: o pt-0 default do CardContent deixaria o card sem topo. */}
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-5">
          {/* ÚNICO caminho de troca da foto: clicar na própria foto. */}
          <button
            type="button"
            aria-label="Trocar foto do perfil"
            title="Trocar foto"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="group relative shrink-0 cursor-pointer overflow-hidden rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <UserAvatar
              avatarUrl={preview ?? profile.avatarUrl}
              firstName={profile.name}
              size="xl"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {uploading ? (
                <Spinner className="text-white" />
              ) : (
                <Camera className="size-6 text-white" />
              )}
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="size-4" />
            Editar perfil
          </Button>
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
