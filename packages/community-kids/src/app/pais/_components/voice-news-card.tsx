'use client'

import { Mic } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ProfileView } from '@/lib/types'
import { childEditHref } from '../parent-routes'
import { PRIMARY_ACTION, SECONDARY_ACTION } from './parent-actions'

/**
 * "Novidade: a criança pode falar em vez de escrever" (14/10/2026). A fala nasce DESLIGADA (a
 * Política promete a opção mais protetiva por padrão), então as famílias que já existem só
 * descobrem a opção por aqui. Aparece enquanto alguma criança está com a fala desligada e até o
 * responsável dispensar NESTE navegador. Leva ao "Editar perfil" de cada criança, onde mora a
 * escolha (e o login recente que ligar exige).
 */
const DISMISSED_KEY = (accountId: string) => `sz:kids:pais:novidade-fala:${accountId}`

export function VoiceNewsCard({
  accountId,
  profiles,
}: {
  accountId: string
  profiles: ProfileView[]
}) {
  // Lido depois de montar: ler o armazenamento no primeiro quadro dá diferença de hidratação.
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY(accountId)) === '1')
    } catch {
      setDismissed(false)
    }
  }, [accountId])

  const off = profiles.filter((profile) => profile.voiceInputEnabled !== true)
  if (dismissed || off.length === 0) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY(accountId), '1')
    } catch {
      // Sem armazenamento, o aviso volta na próxima visita; nada quebra.
    }
  }

  return (
    <section aria-labelledby="voice-news" className="kids-carta flex flex-col gap-4 p-6">
      <div className="flex items-start gap-3">
        <span className="kids-marca inline-flex size-10 shrink-0 items-center justify-center rounded-full">
          <Mic className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="voice-news" className="sz-display text-[1.25rem]">
            Novidade: a criança pode falar em vez de escrever
          </h2>
          <p className="max-w-3xl text-muted-foreground text-sm">
            Na hora de pedir ajuda, ela aperta Falar, conta a dúvida e confere o texto antes de
            enviar. Facilita muito para quem ainda escreve devagar. A fala vai a um serviço de
            transcrição fora do Brasil e vira texto na hora; nós não guardamos a gravação. Só a
            nossa equipe lê esse texto: outras crianças não veem. A opção vem desligada, e você liga
            no perfil de cada criança.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {off.map((profile, index) => (
          <Link
            key={profile.id}
            href={childEditHref(profile.id)}
            className={index === 0 ? PRIMARY_ACTION : SECONDARY_ACTION}
          >
            Ligar a fala de {profile.name}
          </Link>
        ))}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 px-3 font-bold text-sm underline underline-offset-4"
        >
          Agora não
        </button>
      </div>
    </section>
  )
}
