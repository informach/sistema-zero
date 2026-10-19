import { describe, expect, it } from 'bun:test'
import { canOpenPensaStudioTask } from '../src/lib/pensa-capabilities'
import { kidsStaffPreview, kidsView } from './kids-journey-fixtures'

const COM_BLOCO = { status: 200, body: { blocks: ['sz_g2d_setup_stage'] } }
const SEM_BLOCO = { status: 200, body: { blocks: [] } }

describe('capability Pensa → Estúdio', () => {
  it('exige simultaneamente produto, liberação pela jornada e algum bloco conquistado', () => {
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        journey: kidsView([]),
        unlocks: COM_BLOCO,
      }),
    ).toBe(false)
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: false,
        journey: kidsView(['studio'], 'god'),
        unlocks: COM_BLOCO,
      }),
    ).toBe(false)
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        journey: kidsView(['studio'], 'god'),
        unlocks: COM_BLOCO,
      }),
    ).toBe(true)
    // Sem bloco conquistado o Estúdio livre está trancado: a tarefa não oferece abri-lo.
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        journey: kidsView(['studio'], 'god'),
        unlocks: SEM_BLOCO,
      }),
    ).toBe(false)
  })

  it('falha fechado sem policy publicada e preserva o acesso da equipe interna', () => {
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        journey: null,
        unlocks: COM_BLOCO,
      }),
    ).toBe(false)
    expect(
      canOpenPensaStudioTask({
        studioProductOwned: true,
        journey: kidsStaffPreview,
        unlocks: SEM_BLOCO,
      }),
    ).toBe(true)
  })
})
