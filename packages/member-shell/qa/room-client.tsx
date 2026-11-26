/** A tela "Meu quarto" de verdade (pele Kids), com o servidor de mentira de `room-serve.ts`. */

import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { KidsCosmetics } from '../../community-kids/src/components/kids/cosmetics-presentation'
import { RoomBuilder } from '../src/components/cosmetics/room/room-builder'

const root = document.getElementById('root')
const comAvatar = new URLSearchParams(location.search).get('avatar') !== '0'
function PreviaDoQuarto() {
  const [aberto, setAberto] = useState(true)
  return (
    <>
      <nav aria-label="Navegação da prévia" className="px-4 py-2">
        <button type="button" onClick={() => setAberto((atual) => !atual)}>
          {aberto ? 'Sair da prévia do quarto' : 'Voltar à prévia do quarto'}
        </button>
      </nav>
      {aberto ? (
        <div className="px-4 py-4">
          <KidsCosmetics>
            <RoomBuilder
              avatarPhotoUrl={comAvatar ? '/avatar.png' : null}
              header={
                <h1 className="sr-only [font-family:var(--font-display)] font-extrabold text-2xl leading-none md:not-sr-only md:px-1">
                  Meu quarto
                </h1>
              }
            />
          </KidsCosmetics>
        </div>
      ) : (
        <p>Outra tela da prévia.</p>
      )}
    </>
  )
}
if (root) createRoot(root).render(<PreviaDoQuarto />)
