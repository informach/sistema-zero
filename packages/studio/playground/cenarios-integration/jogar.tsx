import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicPlayer } from '../../../member-shell/src/components/creator/public-player'
import './jogar.css'

// The real /jogar UI and player; only the publication API is supplied by the local test.
// This does not publish to an account or replace the final Next/gateway staging check.
const id = location.pathname.split('/').at(-1) ?? ''
if (!/^[0-9a-f-]{36}$/.test(id)) throw Error('Use a rota local /jogar/:id.')
const root = document.getElementById('root')
if (!root) throw Error('Raiz do player ausente')
createRoot(root).render(
  <StrictMode>
    <PublicPlayer id={id} skin="adult" />
  </StrictMode>,
)
