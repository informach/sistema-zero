import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createProRunStore, type ProRunState, proRunLabelKey, useProRun } from './proRun'
import { StudioStoresContext } from './storesContext'
import { createStudioStores } from './studioStores'

const running: ProRunState = { phase: 'running', canRun: true, canStop: true }

describe('proRun (o estado de execução do projeto Pro)', () => {
  it('a prévia publica estado e ações juntos e os tira juntos ao sair de cena', () => {
    const store = createProRunStore()
    expect(store.getState().state).toBeNull()
    expect(store.getState().actions).toBeNull()
    const actions = { run: () => {}, stop: () => {} }
    store.getState().publish(running, actions)
    expect(store.getState().state).toBe(running)
    expect(store.getState().actions).toBe(actions)
    store.getState().publish(null, null)
    expect(store.getState()).toMatchObject({ state: null, actions: null })
  })

  it('o layout registra quem traz o palco à vista e a Topbar chama', () => {
    const store = createProRunStore()
    let revealed = 0
    store.getState().setRevealStage(() => {
      revealed += 1
    })
    store.getState().revealStage?.()
    expect(revealed).toBe(1)
    store.getState().setRevealStage(null)
    expect(store.getState().revealStage).toBeNull()
  })

  it('o rótulo do botão principal: Rodar parado, Rodar de novo com algo em andamento ou feito', () => {
    expect(proRunLabelKey(null)).toBe('run.run')
    expect(proRunLabelKey({ phase: 'idle' })).toBe('run.run')
    expect(proRunLabelKey({ phase: 'unsupported' })).toBe('run.run')
    for (const phase of ['preparing', 'running', 'waiting', 'done', 'error'] as const)
      expect(proRunLabelKey({ phase })).toBe('run.runAgain')
  })

  it('cada <Studio> tem a sua store; fora de um Studio o hook lê a default de módulo', () => {
    const stores = createStudioStores()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StudioStoresContext.Provider value={stores}>{children}</StudioStoresContext.Provider>
    )
    stores.proRun.getState().publish(running, { run: () => {}, stop: () => {} })
    const inside = renderHook(() => useProRun((s) => s.state?.phase ?? null), { wrapper })
    expect(inside.result.current).toBe('running')
    const outside = renderHook(() => useProRun((s) => s.state?.phase ?? null))
    expect(outside.result.current).toBeNull()
    // Duas instâncias na mesma página não se enxergam.
    expect(createStudioStores().proRun.getState().state).toBeNull()
  })
})
