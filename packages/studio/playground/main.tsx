import React from 'react'
import ReactDOM from 'react-dom/client'
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
