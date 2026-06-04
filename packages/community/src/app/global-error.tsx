'use client'

/**
 * Error boundary GLOBAL (substitui o root layout em falhas não capturadas). É um
 * Client Component AUTOCONTIDO (renderiza o próprio `<html>/<body>`, SEM os
 * Providers/contextos) — evita o `useContext null` no prerender da página
 * `/_global-error` que o boundary default do Next gera. Mantenha-o mínimo.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#0a0a0a',
          color: '#fafafa',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Algo deu errado
          </h1>
          <p style={{ color: '#a1a1aa', marginBottom: '1.5rem' }}>
            Ocorreu um erro inesperado no painel.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#fafafa',
              color: '#0a0a0a',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
