import { describe, expect, it } from 'bun:test'
import { canOpenPensaStudioTask } from '../src/lib/pensa-capabilities'

describe('capability Pensa → Estúdio', () => {
  it('exige simultaneamente produto e liberação do Estúdio pela carreira', () => {
    expect(
      canOpenPensaStudioTask({ studioProductOwned: true, levelSlug: 'noob', role: 'student' }),
    ).toBe(false)
    expect(
      canOpenPensaStudioTask({ studioProductOwned: false, levelSlug: 'god', role: 'student' }),
    ).toBe(false)
    expect(
      canOpenPensaStudioTask({ studioProductOwned: true, levelSlug: 'god', role: 'student' }),
    ).toBe(true)
  })

  it('falha fechado sem rank conhecido e preserva o acesso da equipe interna', () => {
    expect(
      canOpenPensaStudioTask({ studioProductOwned: true, levelSlug: undefined, role: 'student' }),
    ).toBe(false)
    expect(
      canOpenPensaStudioTask({ studioProductOwned: true, levelSlug: 'noob', role: 'staff' }),
    ).toBe(true)
  })
})
