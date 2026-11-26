/** A tela "Meu quarto" de verdade (pele Kids), com o servidor de mentira de `room-serve.ts`. */
import { createRoot } from 'react-dom/client'
import { KidsCosmetics } from '../../community-kids/src/components/kids/cosmetics-presentation'
import { RoomBuilder } from '../src/components/cosmetics/room/room-builder'

const root = document.getElementById('root')
const comAvatar = new URLSearchParams(location.search).get('avatar') !== '0'
if (root)
  createRoot(root).render(
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
    </div>,
  )
