import { describe, expect, it } from 'bun:test'
import { canOpenPensaStudioTask } from '../src/lib/pensa-capabilities'

const COM_BLOCO = { status: 200, body: { blocks: ['sz_g2d_setup_stage'] } }
const SEM_BLOCO = { status: 200, body: { blocks: [] } }

describe('capability Pensa → Estúdio', () => {
  it('exige simultaneamente produto, liberação pela jornada e algum bloco conquistado', () => {
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        levelSlug: 'noob',
        role: 'student',
        unlocks: COM_BLOCO,
      }),
    ).toBe(false)
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: false,
        levelSlug: 'god',
        role: 'student',
        unlocks: COM_BLOCO,
      }),
    ).toBe(false)
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        levelSlug: 'god',
        role: 'student',
        unlocks: COM_BLOCO,
      }),
    ).toBe(true)
    // Sem bloco conquistado o Estúdio livre está trancado: a tarefa não oferece abri-lo.
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        levelSlug: 'god',
        role: 'student',
        unlocks: SEM_BLOCO,
      }),
    ).toBe(false)
  })

  it('falha fechado sem rank conhecido e preserva o acesso da equipe interna', () => {
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        levelSlug: undefined,
        role: 'student',
        unlocks: COM_BLOCO,
      }),
    ).toBe(false)
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        levelSlug: 'noob',
        role: 'staff',
        unlocks: SEM_BLOCO,
      }),
    ).toBe(true)
  })
})
