'use client'

import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import {
  type AdultProfilePreferences,
  AdultProfilePreferencesSchema,
} from '@sistemazero/core/profiles'
import { apiGet, apiSend } from '@sistemazero/member-shell/lib/api'
import { Input } from '@sistemazero/ui/input'
import { Mic, MicOff, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { AiCreditsPanel } from './profile/ai-credits-panel'
import { FIELD_CONTROL, ProfileField } from './profile/field'

/** A Política de Privacidade do adulto (publicada pelo funil em `/pro/privacidade`). */
const POLITICA_PRIVACIDADE_URL = 'https://sistemazero.com.br/pro/privacidade'

const CHECKBOX =
  'mt-0.5 size-[1.4rem] shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed'

/**
 * "Identidade na comunidade" e "Créditos e voz" (direção de arte de 18/10/2026). As duas seções gravam o
 * MESMO registro (`/api/members/adult/profile`), então dividem o estado salvo: cada botão envia só
 * o que a sua seção mudou sobre a última versão salva, e salvar uma nunca desfaz a outra.
 */
export function PublicProfileSettings({
  initial,
  viewerId,
  readOnly,
  ai,
}: {
  initial: AdultProfilePreferences | null
  viewerId: string
  readOnly: boolean
  /**
   * Presente só com a capacidade `ai` da jornada (ela libera o Zappy). `pensaUnlocked`: a jornada
   * também liberou o Pensa (capacidade `pensa`); sem ela, a frase não promete o Pensa.
   */
  ai: { credits: AiCreditsView | null; voiceConfigured: boolean; pensaUnlocked: boolean } | null
}) {
  const [saved, setSaved] = useState(initial)
  const [identity, setIdentity] = useState(
    initial ? { displayName: initial.displayName, publicEnabled: initial.publicEnabled } : null,
  )
  const [voiceEnabled, setVoiceEnabled] = useState(initial?.voiceEnabled ?? false)
  const [busy, setBusy] = useState<'identity' | 'voice' | 'reload' | null>(null)

  async function reload() {
    setBusy('reload')
    try {
      const fresh = await apiGet<AdultProfilePreferences>('/api/members/adult/profile')
      setSaved(fresh)
      setIdentity({ displayName: fresh.displayName, publicEnabled: fresh.publicEnabled })
      setVoiceEnabled(fresh.voiceEnabled)
    } catch {
      toast.error('Não foi possível carregar suas preferências.')
    } finally {
      setBusy(null)
    }
  }

  async function save(section: 'identity' | 'voice') {
    if (!saved || !identity) return
    const next =
      section === 'identity' ? { ...saved, ...identity } : { ...saved, voiceEnabled: voiceEnabled }
    const parsed = AdultProfilePreferencesSchema.safeParse(next)
    if (!parsed.success) {
      toast.error('Informe um nome de exibição com até 60 caracteres.')
      return
    }
    setBusy(section)
    try {
      const result = await apiSend<AdultProfilePreferences>(
        '/api/members/adult/profile',
        'PUT',
        parsed.data,
        { 'x-sz-viewer': viewerId },
      )
      setSaved(result)
      if (section === 'identity')
        setIdentity({ displayName: result.displayName, publicEnabled: result.publicEnabled })
      else setVoiceEnabled(result.voiceEnabled)
      toast.success(section === 'identity' ? 'Preferências salvas.' : 'Preferência salva.')
    } catch {
      toast.error('Não foi possível salvar. Suas alterações foram preservadas.')
    } finally {
      setBusy(null)
    }
  }

  const unavailable = (
    <div className="flex flex-col items-start gap-3">
      <p role="status" className="text-muted-foreground">
        Preferências indisponíveis agora.
      </p>
      <button
        type="button"
        className="sz-btn-outline sz-btn-sm"
        disabled={busy !== null}
        onClick={() => void reload()}
      >
        Tentar novamente
      </button>
    </div>
  )

  return (
    <>
      <section
        id="identidade"
        aria-labelledby="perfil-identidade"
        className="sz-card flex scroll-mt-28 flex-col gap-5 p-6 md:p-8"
      >
        <h2 id="perfil-identidade" className="sz-h3">
          Identidade na comunidade
        </h2>
        {saved && identity ? (
          <>
            <ProfileField
              id="displayName"
              label="Nome de exibição"
              hint="Até 60 caracteres."
              className="max-w-[26rem]"
            >
              <Input
                id="displayName"
                maxLength={60}
                disabled={busy !== null || readOnly}
                value={identity.displayName}
                onChange={(event) => setIdentity({ ...identity, displayName: event.target.value })}
                className={FIELD_CONTROL}
              />
            </ProfileField>
            <label className="sz-soft flex cursor-pointer items-start gap-3.5 p-4">
              <input
                type="checkbox"
                className={CHECKBOX}
                disabled={busy !== null || readOnly}
                checked={identity.publicEnabled}
                onChange={(event) =>
                  setIdentity({ ...identity, publicEnabled: event.target.checked })
                }
              />
              <span className="flex flex-col gap-1">
                <strong>Exibir meu perfil para os membros da comunidade</strong>
                <span className="text-[0.9rem] text-muted-foreground">
                  Nome escolhido, avatar, progresso, conquistas, jogos e espaço 3D. Seus dados de
                  acesso continuam privados. Desligado, você aparece como “Colega” nas conversas.
                </span>
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                className="sz-btn"
                disabled={busy !== null || readOnly}
                onClick={() => void save('identity')}
              >
                {busy === 'identity' ? 'Salvando...' : 'Salvar preferências'}
              </button>
              {saved.publicEnabled ? (
                <Link className="sz-link" href={`/criador/${viewerId}?de=perfil`} prefetch={false}>
                  Ver meu perfil público
                </Link>
              ) : null}
            </div>
          </>
        ) : (
          unavailable
        )}
      </section>

      {ai ? (
        <section
          id="creditos"
          aria-labelledby="perfil-creditos"
          className="sz-card flex scroll-mt-28 flex-col gap-6 p-6 md:p-8"
        >
          <div className="flex flex-col gap-1.5">
            <h2 id="perfil-creditos" className="sz-h3">
              Créditos e voz
            </h2>
            <p className="text-[0.9rem] text-muted-foreground">
              {ai.pensaUnlocked
                ? 'O Zappy, o tutor do Estúdio, e o Pensa já estão liberados na sua jornada. Aqui você vê quantos créditos restam.'
                : 'O Zappy, o tutor do Estúdio, já está liberado na sua jornada. Aqui você vê quantos créditos restam.'}
            </p>
          </div>
          <AiCreditsPanel credits={ai.credits} />
          {ai.voiceConfigured ? (
            <div className="flex flex-col gap-3.5 border-border border-t pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 basis-[16rem] flex-col gap-1">
                  <h3 className="sz-h4">Voz</h3>
                  <p className="text-[0.9rem] text-muted-foreground">
                    Fale em vez de digitar. A voz fica desligada até você autorizar aqui.
                  </p>
                </div>
                {saved ? (
                  saved.voiceEnabled ? (
                    <span className="sz-chip sz-chip-ok">
                      <Mic aria-hidden />
                      Ligada
                    </span>
                  ) : (
                    <span className="sz-chip">
                      <MicOff aria-hidden />
                      Desligada
                    </span>
                  )
                ) : null}
              </div>
              {saved && identity ? (
                <>
                  <label className="sz-soft flex cursor-pointer items-start gap-3.5 p-4">
                    <input
                      type="checkbox"
                      className={CHECKBOX}
                      disabled={busy !== null || readOnly}
                      checked={voiceEnabled}
                      onChange={(event) => setVoiceEnabled(event.target.checked)}
                    />
                    <span className="flex flex-col gap-1">
                      <strong>Usar voz no Pensa e no Zappy</strong>
                      <span className="text-[0.9rem] text-muted-foreground">
                        Você confere o texto antes de enviar e pode desligar quando quiser. Na
                        primeira vez, o navegador pede licença para usar o microfone.
                      </span>
                    </span>
                  </label>
                  <div className="flex items-start gap-3 rounded-[0.8rem] border border-border px-4 py-4">
                    <ShieldCheck
                      className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <p className="text-[0.9rem]">
                      A gravação não fica guardada pela Sistema Zero. A fala vai para um serviço de
                      transcrição fora do Brasil e volta como texto.{' '}
                      <a
                        href={POLITICA_PRIVACIDADE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sz-link"
                      >
                        Política de privacidade
                      </a>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="sz-btn self-start"
                    disabled={busy !== null || readOnly}
                    onClick={() => void save('voice')}
                  >
                    {busy === 'voice' ? 'Salvando...' : 'Salvar preferência'}
                  </button>
                </>
              ) : (
                unavailable
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
