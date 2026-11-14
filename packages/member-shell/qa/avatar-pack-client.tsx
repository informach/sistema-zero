/** A tela "Meu avatar" de verdade (Kids ou adulta), com o servidor de mentira de `avatar-pack-serve.ts`. */
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { KidsCosmetics } from '../../community-kids/src/components/kids/cosmetics-presentation'
import { AvatarConfigurator } from '../src/components/cosmetics/avatar3d/configurator'
import { AdultAvatarConfiguratorEntry } from '../src/components/cosmetics/avatar3d/configurator-adult-entry'

const skin = new URLSearchParams(location.search).get('skin') === 'adult' ? 'adult' : 'kids'
const root = document.getElementById('root')
if (root)
  createRoot(root).render(
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {skin === 'adult' ? (
        <AdultAvatarConfiguratorEntry dark={false} returnTo="/perfil" />
      ) : (
        <KidsCosmetics>
          <AvatarConfigurator dark={false} returnTo="/perfil" />
        </KidsCosmetics>
      )}
      <Toaster position="top-center" />
    </div>,
  )
