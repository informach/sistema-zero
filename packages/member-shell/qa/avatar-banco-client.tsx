/**
 * O banco de fotos da troca do avatar (`members/scripts/swap-avatar.ts`): a foto de frente de cada
 * um dos sorteados de menino, tirada pela MESMA cena e pelo mesmo enquadramento do "Meu avatar"
 * (`AvatarScene`, `capture({portrait: true})`). Cada foto vai para o servidor de conferência, que
 * guarda no disco. `?de=0&ate=199`.
 *
 * ⚠️ O sorteado número N é o `bankAvatar(N)` do Members: `drawAvatar(catalogo, 'troca-N', {filter:
 * 'boy'})`. Gere as fotos com o MESMO catálogo com que a troca vai rodar.
 */
import { AVATAR_CATALOG as C, drawAvatar } from '@sistemazero/core/avatar'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AvatarScene, type CaptureFn } from '../src/components/cosmetics/avatar3d/avatar-scene'

const q = new URLSearchParams(location.search)
const de = Number(q.get('de') ?? 0)
const ate = Number(q.get('ate') ?? 199)
const sorteado = (i: number) => drawAvatar(C, `troca-${i}`, { filter: 'boy' })

function Banco() {
  const [i, setI] = useState(de)
  const captura = useRef<CaptureFn | null>(null)
  const [status, setStatus] = useState('começando')
  const slots = useMemo(() => sorteado(Math.min(i, ate)), [i])
  useEffect(() => {
    if (i > ate) {
      setStatus('pronto')
      document.body.dataset.pronto = '1'
      return
    }
    let vivo = true
    ;(async () => {
      // A cena troca as peças; a captura espera todas na cena e o boneco assentado.
      await new Promise((r) => setTimeout(r, 400))
      let blob: Blob | null = null
      for (let t = 0; t < 5 && vivo && !blob; t++)
        blob = (await captura.current?.({ portrait: true })) ?? null
      if (!vivo) return
      if (blob) await fetch(`/__banco/${i}`, { method: 'POST', body: blob })
      else await fetch(`/__banco/${i}/falhou`, { method: 'POST' })
      setStatus(`${i} ${blob ? 'ok' : 'falhou'}`)
      setI(i + 1)
    })()
    return () => {
      vivo = false
    }
  }, [i])
  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, fontFamily: 'sans-serif' }}>
      <div style={{ width: 512, height: 512 }}>
        <AvatarScene
          slots={slots}
          onReady={(c) => {
            captura.current = c
          }}
          dark={false}
        />
      </div>
      <p>{status}</p>
    </div>
  )
}

const raiz = document.getElementById('root')
if (raiz) createRoot(raiz).render(<Banco />)
