import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GameMeasurement } from '../../src/app/admin/jogo/game-measurement'

/** Monta o componente real da aba, sem login ou dados de ambientes remotos. */
function LocalMeasurement() {
  const [publico, setPublico] = useState<'kids' | 'adulto'>('kids')
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
      <header>
        <p className="text-sm text-muted-foreground">
          Sistema Zero · Admin · Dados fictícios locais
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Jogo · Medição</h1>
      </header>
      <GameMeasurement publico={publico} onPublicoChange={setPublico} />
    </main>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Falta o elemento local.')
createRoot(root).render(<LocalMeasurement />)
