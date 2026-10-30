import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { ArquipelagoAvatarDialog } from '../src/components/arquipelago-avatar-dialog'

function Conferencia() {
  const [fim, terminar] = useState<boolean | null>(null)
  const publico =
    new URLSearchParams(location.search).get('publico') === 'adulto' ? 'adulto' : 'kids'
  return (
    <>
      <Toaster />
      {fim === null ? (
        <ArquipelagoAvatarDialog publico={publico} festa="carnaval" onFinish={terminar} />
      ) : (
        <main>
          <h1>Voltou ao jogo</h1>
          <p role="status">{fim ? 'Avatar salvo' : 'Prévia cancelada'}</p>
        </main>
      )}
    </>
  )
}
const elemento = document.getElementById('root')
if (!elemento) throw Error('Raiz da conferência ausente')
createRoot(elemento).render(<Conferencia />)
