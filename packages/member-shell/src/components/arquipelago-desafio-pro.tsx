'use client'

import { lazy, Suspense, useEffect, useState } from 'react'
import { challengeForViewer } from '../lib/arquipelago-challenge'
import { avisarOJogo } from '../lib/arquipelago-pro-mensagem'
import { sessionFetch } from '../lib/session-fetch'

const ChallengeDialog = lazy(() =>
  import('./arquipelago-challenge-dialog').then((m) => ({ default: m.ArquipelagoChallengeDialog })),
)

/**
 * O desafio Pro do jogo na rota isolada (lacunas, 01/11/2026): a página do jogo abre esta rota
 * num quadro (`/estudio/pro/desafio/<id>?revisao=<n>&embed=arquipelago`), que lê o desafio pelo
 * mesmo repasse do jogo e roda o mesmo fluxo de desafio com o modo Código. Ao terminar, avisa o
 * jogo se ele foi aprovado. Fora de um quadro do jogo, não abre.
 */
export function ArquipelagoDesafioPro({
  desafioId,
  revisao,
  jogadorId,
  audience,
}: {
  desafioId: string
  revisao: number
  jogadorId: string
  audience: 'kids' | 'adult'
}) {
  const [desafio, setDesafio] = useState<ReturnType<typeof challengeForViewer> | null>(null)
  const [erro, setErro] = useState(false)
  useEffect(() => {
    if (window.parent === window) {
      setErro(true)
      return
    }
    const controle = new AbortController()
    void sessionFetch(`/api/arquipelago/desafios/${encodeURIComponent(desafioId)}`, {
      cache: 'no-store',
      signal: controle.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('desafio indisponível')
        const lido = challengeForViewer(await r.json(), jogadorId, {
          tipo: 'desafio',
          desafioId,
          revisao,
        })
        if (!controle.signal.aborted) setDesafio(lido)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [desafioId, revisao, jogadorId])
  if (erro)
    return (
      <p role="alert" className="p-6 text-sm">
        Não deu para abrir este desafio aqui. Volte ao jogo e tente de novo.
      </p>
    )
  if (!desafio) return null
  return (
    <Suspense fallback={null}>
      <ChallengeDialog
        desafio={desafio}
        audience={audience}
        onFinish={(concluido) =>
          avisarOJogo({ tipo: 'arquipelago-pro', evento: 'desafio', desafioId, concluido })
        }
      />
    </Suspense>
  )
}
