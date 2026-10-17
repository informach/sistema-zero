import { PensaApp, type PensaHostAdapter, PensaHostChromeProvider } from '@sistemazero/pensa'
import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createProjectServer } from './project-server'
import './styles.css'

function Playground() {
  const [notice, setNotice] = useState('')
  const [menuHidden, setMenuHidden] = useState(false)
  const transport = useMemo(
    () => createProjectServer(new URLSearchParams(location.search).has('vazio')),
    [],
  )
  const adapter = useMemo<PensaHostAdapter>(
    () => ({
      transport,
      viewerId: 'playground',
      mode: 'kids',
      theme: 'light',
      onOpenMission: (mission) =>
        setNotice(
          `A missão abre no ${mission.destination === 'studio' ? 'Estúdio' : mission.destination === 'pinta' ? 'Pinta' : 'Molda'} no aplicativo completo.`,
        ),
      onOpenGame: () => setNotice('O jogo abre no Estúdio no aplicativo completo.'),
    }),
    [transport],
  )
  return (
    <PensaHostChromeProvider
      value={{
        menu: {
          hidden: menuHidden,
          label: menuHidden ? 'Mostrar menu' : 'Esconder menu',
          onToggle: () => setMenuHidden(!menuHidden),
        },
        back: {
          href: '#',
          label: 'Voltar para Criar',
          onNavigate: () => setNotice('Você está no playground do Pensa.'),
        },
      }}
    >
      <PensaApp adapter={adapter} />
      <p role="status" className="pensa-playground-notice">
        {notice}
      </p>
    </PensaHostChromeProvider>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing playground root')
createRoot(root).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
)
