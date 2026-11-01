import { createRoot } from 'react-dom/client'
import { JogoClient } from '../../src/app/admin/jogo/jogo-client'
import { PlatformProvider } from '../../src/components/admin/platform-provider'
import { setPlatform } from '../../src/components/admin/platform-store'

const root = document.getElementById('root')
if (!root) throw new Error('Missing preview root')
createRoot(root).render(
  <PlatformProvider initialPlatform="kids">
    <div className="min-h-screen bg-background text-foreground">
      <nav aria-label="Comunidade" className="flex gap-4 border-b border-border p-4">
        <button type="button" onClick={() => setPlatform('kids')}>
          Kids
        </button>
        <button type="button" onClick={() => setPlatform('adult')}>
          Adultos
        </button>
      </nav>
      <JogoClient canWrite />
    </div>
  </PlatformProvider>,
)
