import type { CenarioRuntimeMontagem } from '@sistemazero/molda-cenarios-core/runtime'
import { createRoot } from 'react-dom/client'
import { CenariosApp } from '../src/CenariosApp'
import { criarHostHttp } from '../src/host-http'
import './estilos.css'

await fetch('/api/molda-cenarios/local', { credentials: 'same-origin' })
const runtimeUrl = '/runtime/entrada.js'
const runtime = (await import(/* @vite-ignore */ runtimeUrl)) as CenarioRuntimeMontagem
const host = criarHostHttp({ runtime, tema: 'light' })
createRoot(document.getElementById('app')!).render(<CenariosApp host={host} />)
