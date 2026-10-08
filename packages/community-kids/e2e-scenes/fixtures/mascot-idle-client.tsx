import { ZappyFalaProvider } from '@sistemazero/member-shell/components/zappy-fala-context'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { KidsMascotAnimated } from '../../src/components/kids/mascot-rive'

/** Rive real, no mesmo regime de voz do balão, sem depender de áudio ou login. */
function Fixture() {
  const [falando, setFalando] = useState(false)
  return (
    <main className="p-4">
      <div data-mascot>
        <ZappyFalaProvider value={{ podeFalar: true, falando }}>
          <KidsMascotAnimated expression="speaking" className="size-16 sm:size-24" />
        </ZappyFalaProvider>
      </div>
      <button type="button" onClick={() => setFalando(!falando)}>
        {falando ? 'Parar' : 'Ouvir'}
      </button>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
