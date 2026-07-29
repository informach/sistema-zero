import { describe, expect, it } from 'bun:test'
import {
  isGuidedCreationActive,
  setGuidedCreationActive,
} from '../src/components/kids/guided-creation-session'

describe('sessão do modo criação guiada', () => {
  it('continua ativa quando a árvore da aula é remontada após o envio', () => {
    const identity = { lessonId: 'aula-remount', viewerId: 'crianca-1' }

    setGuidedCreationActive(identity, true)

    // Uma nova montagem consulta a memória do módulo em vez de voltar para false.
    expect(isGuidedCreationActive(identity)).toBe(true)

    setGuidedCreationActive(identity, false)
    expect(isGuidedCreationActive(identity)).toBe(false)
  })

  it('não mistura aulas nem perfis diferentes no mesmo navegador', () => {
    const active = { lessonId: 'aula-a', viewerId: 'crianca-1' }
    setGuidedCreationActive(active, true)

    expect(isGuidedCreationActive({ lessonId: 'aula-b', viewerId: 'crianca-1' })).toBe(false)
    expect(isGuidedCreationActive({ lessonId: 'aula-a', viewerId: 'crianca-2' })).toBe(false)

    setGuidedCreationActive(active, false)
  })
})
