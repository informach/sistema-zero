'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Spinner } from '@sistemazero/ui/spinner'
import { Pencil, Sparkles, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { AvatarWithAura } from '@/components/kids/avatar-with-aura'
import { LevelBadge } from '@/components/kids/level-badge'
import { apiSend } from '@/lib/api'
import type { ProfileView, StudentLevelView } from '@/lib/types'

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
  level,
  levelHint,
  avatarPhotoUrl,
}: {
  profile: ProfileView
  ranking: RankingInfo | null
  level: StudentLevelView | null
  /** Frase do próximo marco, JÁ limitada ao catálogo (montada no servidor com
   *  `nextLevelHintWithin` — a mesma do mapa, para os dois números nunca divergirem). */
  levelHint: string | null
  avatarPhotoUrl: string | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  return (
    <>
      <IdentityCard
        profile={profile}
        ranking={ranking}
        level={level}
        levelHint={levelHint}
        avatarPhotoUrl={avatarPhotoUrl}
        onEdit={() => setEditing(true)}
        // Personalizar = abrir o configurador 3D em tela cheia (não há mais modal).
        onCustomize={() => router.push('/meu-avatar')}
      />
      <Dialog open={editing} onClose={() => setEditing(false)} title="Editar perfil">
        <ProfileForm profile={profile} onDone={() => setEditing(false)} />
      </Dialog>
    </>
  )
}

/**
 * O herói azul do Meu perfil (telas-modelo de 11/09/2026, medido a 1440px): o avatar num
 * QUADRADO de cantos redondos (104px) à esquerda, o nome em Baloo com o selo AMARELO do
 * nível real, a frase do próximo marco, a pílula de vidro do ranking e, à direita, os dois
 * botões empilhados (branco para personalizar, vidro para editar). A tinta é o par da
 * marca (`.kids-marca`), que troca de lado no escuro sozinho.
 */
function IdentityCard({
  profile,
  ranking,
  level,
  levelHint,
  avatarPhotoUrl,
  onEdit,
  onCustomize,
}: {
  profile: ProfileView
  ranking: RankingInfo | null
  level: StudentLevelView | null
  levelHint: string | null
  avatarPhotoUrl: string | null
  onEdit: () => void
  onCustomize: () => void
}) {
  const hint = levelHint
  return (
    <section
      aria-label="Meu cartão de criador"
      className="kids-marca rounded-[1.75rem] p-5 shadow-[0_18px_40px_-26px_color-mix(in_oklab,var(--sz-primary)_70%,transparent)] md:px-[1.625rem] md:py-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-[1.625rem]">
        {/* Clicar no avatar abre o configurador 3D (único caminho de personalização). */}
        <button
          type="button"
          aria-label="Personalizar avatar"
          title="Personalizar avatar"
          onClick={onCustomize}
          className="group relative w-fit shrink-0 cursor-pointer rounded-[1.5rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sz-primary-fg)"
        >
          <AvatarWithAura
            photoUrl={avatarPhotoUrl}
            name={profile.name}
            size="xl"
            // O quadrado de vidro das telas-modelo, e não o círculo: sobre o azul do
            // herói, a inicial no círculo azul da marca sumiria.
            className="kids-marca-vidro size-24 rounded-[1.5rem] md:size-[6.5rem]"
            label={`Avatar de ${profile.name}`}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center rounded-[1.5rem] bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <Sparkles className="size-6 text-white" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="sz-display min-w-0 break-words text-[2rem] md:text-[2.25rem]">
              {profile.name}
            </p>
            <LevelBadge levelSlug={level?.slug} variant="destaque" />
          </div>
          {profile.whatsapp ? (
            <p className="kids-marca-suave mt-1 truncate font-semibold text-sm">
              {profile.whatsapp}
            </p>
          ) : null}
          {hint ? (
            <p className="kids-marca-suave mt-3 max-w-xl text-[0.9375rem] leading-relaxed">
              {hint}
            </p>
          ) : null}
          <Link
            href="/ranking"
            className="kids-marca-vidro mt-4 inline-flex min-h-9 w-fit items-center gap-2 rounded-full px-3.5 py-1.5 font-bold text-[0.8125rem] transition-colors hover:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--sz-primary-fg)_70%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sz-primary-fg) any-pointer-coarse:min-h-11"
          >
            <Trophy className="size-4 shrink-0" aria-hidden />
            {ranking ? (
              <span>
                <span className="sz-display text-sm">{ranking.position}º lugar</span> no ranking
                {ranking.totalStudents ? ` de ${ranking.totalStudents}` : ''}
              </span>
            ) : (
              // Sem colocação ainda (sem XP / vitrine sem ranking) → convite, não vazio.
              <span>Continue praticando para entrar no ranking!</span>
            )}
          </Link>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:w-56 md:flex-col">
          <button
            type="button"
            onClick={onCustomize}
            className="sz-btn-gradient sz-btn-inverso h-12 gap-2 px-5 sm:flex-1 md:w-full md:flex-none"
          >
            <Sparkles className="size-4" aria-hidden />
            Personalizar avatar
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="kids-marca-vidro inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 font-extrabold text-[0.9375rem] transition-colors hover:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--sz-primary-fg)_70%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sz-primary-fg) sm:flex-1 md:w-full md:flex-none"
          >
            <Pencil className="size-4" aria-hidden />
            Editar perfil
          </button>
        </div>
      </div>
    </section>
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
