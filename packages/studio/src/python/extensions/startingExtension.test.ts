import { describe, expect, it } from 'bun:test'
import {
  hasPythonStartingExtension,
  requestPythonStartingExtension,
  takePythonStartingExtension,
} from './startingExtension'

/**
 * O ponto de partida do Python (D5, 11/2026): a lista deixa o pedido e o editor instala UMA vez
 * ao abrir aquele projeto. Remontar o editor (ou o StrictMode) não pode instalar de novo.
 */
describe('ponto de partida do Python', () => {
  it('vale só para o projeto pedido e uma vez', () => {
    requestPythonStartingExtension('projeto-a', 'python-turtle')
    expect(hasPythonStartingExtension('projeto-b')).toBe(false)
    expect(takePythonStartingExtension('projeto-b')).toBeUndefined()
    expect(hasPythonStartingExtension('projeto-a')).toBe(true)
    expect(takePythonStartingExtension('projeto-a')).toBe('python-turtle')
    expect(hasPythonStartingExtension('projeto-a')).toBe(false)
    expect(takePythonStartingExtension('projeto-a')).toBeUndefined()
  })
})
