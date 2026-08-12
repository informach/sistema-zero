import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/baloo-2/latin-500.css'
import '@fontsource/baloo-2/latin-600.css'
import '@fontsource/baloo-2/latin-700.css'
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import { RootErrorFallback } from '../src/components/layout/ErrorViews'
import { ErrorBoundary } from '../src/ui-internal/ErrorBoundary'
import { LandingApp } from './LandingApp'
import './styles.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('root element not found')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary label="app" fallback={RootErrorFallback}>
      <LandingApp />
    </ErrorBoundary>
  </React.StrictMode>,
)
