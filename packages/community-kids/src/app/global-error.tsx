'use client'

import { reportClientError } from '@/lib/report-error'

/**
 * Error boundary RAIZ: pega um throw no PRÓPRIO root layout (onde `(app)/error.tsx`
 * não alcança). Substitui o layout, então traz o seu `<html>`/`<body>` e NÃO recebe
 * o globals.css/fontes do app — daí os estilos inline (cores da marca, tom kids).
 * Último recurso para não cair na tela branca crua do Next numa plataforma infantil.
 *
 * ⚠️ Sem `useEffect`: Next.js pré-renderiza `/_global-error` estaticamente em um
 * contexto sem dispatcher React (sem `useContext`), o que derruba o build. Como
 * `reportClientError` já tem a guarda `typeof window === 'undefined'`, chamá-la
 * direto é seguro: no-op no servidor, beacon no cliente.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Espelha p/ o Sentry pelo beacon (keepalive sobrevive ao reset/navegação).
  console.error(error)
  reportClientError(error)

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          textAlign: 'center',
          background: '#0C1E3E',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div>
          <p style={{ fontSize: '3rem', margin: 0 }}>🌟</p>
          <h1 style={{ fontSize: '1.5rem', margin: '0.5rem 0 0.25rem' }}>Ops! Algo deu errado</h1>
          <p style={{ opacity: 0.8, margin: '0 0 1.25rem' }}>Vamos tentar de novo?</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              // Azul claro da marca (espelho de --sz-kids-azul-vivo; sem tokens aqui).
              background: '#37A6F5',
              color: '#0C1E3E',
              border: 0,
              borderRadius: '9999px',
              padding: '0.7rem 1.6rem',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  )
}
