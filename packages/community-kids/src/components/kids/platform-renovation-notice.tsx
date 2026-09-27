'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import Link from 'next/link'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { dismissRenovation, isRenovationDismissed } from '@/lib/platform-renovation-visit'
import { KidsMascot } from './mascot'

const OverlayContext = createContext({
  noticePending: false,
  guideOpen: false,
  setGuideOpen: (_open: boolean) => {},
})

export const useChildOverlayState = () => useContext(OverlayContext)

export function PlatformRenovationNotice({
  enabled,
  profileId,
  children,
}: {
  enabled: boolean
  profileId: string | null
  children: ReactNode
}) {
  const [decision, setDecision] = useState<{ profileId: string; dismissed: boolean } | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const noticePending =
    enabled && profileId !== null && (decision?.profileId !== profileId || !decision.dismissed)

  useEffect(() => {
    if (enabled && profileId)
      setDecision({ profileId, dismissed: isRenovationDismissed(profileId) })
  }, [enabled, profileId])

  const overlays = useMemo(
    () => ({ noticePending, guideOpen, setGuideOpen }),
    [noticePending, guideOpen],
  )
  function close() {
    if (!profileId) return
    dismissRenovation(profileId)
    setDecision({ profileId, dismissed: true })
  }

  return (
    <OverlayContext.Provider value={overlays}>
      {children}
      <Dialog
        open={noticePending && decision?.profileId === profileId}
        onClose={close}
        title="Tem novidade por aqui!"
        closeLabel="Fechar aviso"
        className="max-w-lg rounded-3xl"
        footer={
          <Button onClick={close} className="min-h-11 w-full sm:w-auto">
            Continuar
          </Button>
        }
      >
        <div className="flex flex-col gap-4 text-base leading-relaxed">
          <KidsMascot expression="happy" className="mx-auto size-20" />
          <p>Ouvimos vocês e estamos melhorando a plataforma!</p>
          <p>
            Vamos regravar todos os cursos e trocar as aulas aos poucos. Alguns vídeos ainda mostram
            a versão antiga, mas você pode continuar estudando.
          </p>
          <p>
            Na área <strong>Como fazer</strong>, vamos colocar tutoriais para ajudar você a usar as
            novidades.
          </p>
          <Link
            href="/como-fazer"
            prefetch={false}
            onClick={close}
            className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4"
          >
            Conhecer o Como fazer
          </Link>
        </div>
      </Dialog>
    </OverlayContext.Provider>
  )
}
