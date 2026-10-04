import { useState } from 'react'
export default function DesafioConvite({ text }: { text: string }) {
  const [status, setStatus] = useState('')
  return (
    <div className="df-copy-invite">
      <blockquote>{text}</blockquote>
      <button
        className="kof-btn kof-btn--secundario"
        type="button"
        data-analytics-id="desafio-copiar-convite"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setStatus('Convite copiado. Você pode enviar a quem quiser conversar com seu filho.')
          } catch {
            setStatus(
              'Não foi possível copiar automaticamente. Selecione o texto acima para copiar.',
            )
          }
        }}
      >
        Copiar o convite para conversar
      </button>
      <p role="status">{status}</p>
    </div>
  )
}
