import { describe, expect, it } from 'bun:test'
import type { PensaProjectDetailView } from '../core/types'
import { PensaApiError } from '../core/types'
import {
  createFakeTransport,
  makeDetail,
  makeIconSvgs,
  makeIdentityArtifact,
  makeIdentitySuggestions,
  makeSpecArtifact,
  makeStageView,
} from '../testing/fakeTransport'
import { createStageEStore, MAX_ICON_GENERATIONS } from './stageEStore'

/** Drena os microtasks pendentes (validação automática dispara async). */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const STAGE_PATH = '/cycles/cycle-1/stages/e'
const GENERATE_PATH = '/cycles/cycle-1/artifacts/generate'
const VALIDATE_PATH = '/cycles/cycle-1/artifacts/friendly_spec/validate'
const ADVANCE_PATH = '/cycles/cycle-1/advance'

describe('stageEStore.loadStage', () => {
  it('popula spec/identity (latest por type) e deriva aprovações do status', async () => {
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) {
        return makeStageView({
          stage: 'e',
          artifacts: [makeSpecArtifact({ status: 'validated' }), makeIdentityArtifact()],
        })
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageEStore(transport)

    await store.getState().loadStage('cycle-1')

    const state = store.getState()
    expect(state.stageLoaded).toBe(true)
    expect(state.spec?.type).toBe('friendly_spec')
    expect(state.identity?.type).toBe('identity')
    // Spec validado ⇒ as seções já foram aprovadas antes.
    expect(state.flowsApproved).toBe(true)
    expect(state.screensApproved).toBe(true)
    // Identidade existente ⇒ funil direto no resumo.
    expect(state.identityStep).toBe('done')
    expect(transport.calls).toEqual([{ path: STAGE_PATH, method: 'GET', body: undefined }])
  })

  it('spec draft e sem identidade: aprovações desligadas, funil no passo do nome', async () => {
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'e', artifacts: [makeSpecArtifact()] })
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageEStore(transport)

    await store.getState().loadStage('cycle-1')

    const state = store.getState()
    expect(state.flowsApproved).toBe(false)
    expect(state.screensApproved).toBe(false)
    expect(state.identity).toBeNull()
    expect(state.identityStep).toBe('name')
  })

  it('erro vira stageError gentil (sem vazar a mensagem técnica)', async () => {
    const transport = createFakeTransport(() => {
      throw new PensaApiError('down', 500, 'INTERNAL_ERROR')
    })
    const store = createStageEStore(transport)

    await store.getState().loadStage('cycle-1')

    expect(store.getState().stageLoaded).toBe(false)
    expect(store.getState().stageError).not.toBeNull()
    expect(store.getState().stageError).not.toContain('down')
  })
})

describe('stageEStore.generateSpec', () => {
  it('feliz: POST {type, projectId} sem feedback e com feedback; aprovações resetam', async () => {
    let version = 0
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'e' })
      if (path === GENERATE_PATH && init?.method === 'POST') {
        version += 1
        return { artifact: makeSpecArtifact({ version }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageEStore(transport)
    await store.getState().loadStage('cycle-1')

    expect(await store.getState().generateSpec('proj-1')).toBe(true)
    expect(store.getState().spec?.version).toBe(1)
    const first = transport.calls.find((call) => call.path === GENERATE_PATH)
    expect(first?.body).toEqual({ type: 'friendly_spec', projectId: 'proj-1' })

    // Aprova as duas seções e pede mudança: a version nova reseta as aprovações.
    store.setState({ flowsApproved: true, screensApproved: true })
    expect(await store.getState().generateSpec('proj-1', 'quero uma tela de recorde')).toBe(true)
    const second = transport.calls.filter((call) => call.path === GENERATE_PATH)[1]
    expect(second?.body).toEqual({
      type: 'friendly_spec',
      projectId: 'proj-1',
      feedback: 'quero uma tela de recorde',
    })
    expect(store.getState().spec?.version).toBe(2)
    expect(store.getState().flowsApproved).toBe(false)
    expect(store.getState().screensApproved).toBe(false)
  })

  it('erro vira specError gentil e devolve false', async () => {
    const transport = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'e' })
      throw new PensaApiError('ia caiu', 502, 'PENSA_AI_UNAVAILABLE')
    })
    const store = createStageEStore(transport)
    await store.getState().loadStage('cycle-1')

    expect(await store.getState().generateSpec('proj-1')).toBe(false)
    expect(store.getState().generatingSpec).toBe(false)
    expect(store.getState().specError).not.toBeNull()
    expect(store.getState().specError).not.toContain('ia caiu')
  })
})

describe('stageEStore: aprovações + validação automática', () => {
  it('aprovar só uma seção não valida; aprovar as duas valida UMA vez', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'e', artifacts: [makeSpecArtifact()] })
      if (path === VALIDATE_PATH && init?.method === 'POST') {
        return { artifact: makeSpecArtifact({ status: 'validated' }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageEStore(transport)
    await store.getState().loadStage('cycle-1')

    store.getState().approveFlows()
    await flush()
    expect(transport.calls.some((call) => call.path === VALIDATE_PATH)).toBe(false)

    store.getState().approveScreens()
    await flush()
    const validateCalls = transport.calls.filter((call) => call.path === VALIDATE_PATH)
    expect(validateCalls).toHaveLength(1)
    expect(store.getState().spec?.status).toBe('validated')

    // Reaprovar não dispara de novo (já validado).
    store.getState().approveFlows()
    store.getState().approveScreens()
    await flush()
    expect(transport.calls.filter((call) => call.path === VALIDATE_PATH)).toHaveLength(1)
  })

  it('validação com erro vira specError; retry manual valida', async () => {
    let fail = true
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'e', artifacts: [makeSpecArtifact()] })
      if (path === VALIDATE_PATH && init?.method === 'POST') {
        if (fail) throw new PensaApiError('boom', 500, 'INTERNAL_ERROR')
        return { artifact: makeSpecArtifact({ status: 'validated' }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageEStore(transport)
    await store.getState().loadStage('cycle-1')

    store.getState().approveFlows()
    store.getState().approveScreens()
    await flush()
    expect(store.getState().specError).not.toBeNull()
    expect(store.getState().spec?.status).toBe('draft')

    fail = false
    expect(await store.getState().validateSpec()).toBe(true)
    expect(store.getState().spec?.status).toBe('validated')
    expect(store.getState().specError).toBeNull()
  })
})

describe('stageEStore: funil de identidade', () => {
  function makeIdentityTransport(renamed: PensaProjectDetailView[] = []) {
    return createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'e', artifacts: [makeSpecArtifact()] })
      if (path === GENERATE_PATH && init?.method === 'POST') {
        const body = init.body as { step?: string; iconSvg?: string | null }
        if (body.step === 'suggestions') return { suggestions: makeIdentitySuggestions() }
        if (body.step === 'icons') return { icons: makeIconSvgs() }
        if (body.step === 'save') {
          return {
            artifact: makeIdentityArtifact({
              content: {
                name: 'Pulo Jurássico',
                palette: makeIdentitySuggestions().palettes[1],
                iconSvg: body.iconSvg ?? null,
              },
            }),
          }
        }
      }
      if (path === '/projects/proj-1' && init?.method === 'PATCH') {
        const detail = makeDetail({ name: 'Pulo Jurássico' })
        renamed.push(detail)
        return { project: detail }
      }
      throw new Error(`rota inesperada: ${path} ${init?.method ?? 'GET'}`)
    })
  }

  it('completo: suggestions → name → palette → icons → save → PATCH do nome', async () => {
    const updated: PensaProjectDetailView[] = []
    const transport = makeIdentityTransport()
    const store = createStageEStore(transport, {
      onProjectUpdated: (project) => updated.push(project),
    })
    await store.getState().loadStage('cycle-1')

    await store.getState().loadSuggestions('proj-1')
    const suggestions = store.getState().suggestions
    expect(suggestions?.names).toHaveLength(3)
    expect(suggestions?.palettes).toHaveLength(4)
    const suggestionsCall = transport.calls.find(
      (call) =>
        call.path === GENERATE_PATH && (call.body as { step?: string }).step === 'suggestions',
    )
    expect(suggestionsCall?.body).toEqual({
      type: 'identity',
      projectId: 'proj-1',
      step: 'suggestions',
    })

    store.getState().chooseName('  Pulo Jurássico  ')
    expect(store.getState().chosenName).toBe('Pulo Jurássico')
    expect(store.getState().identityStep).toBe('palette')

    const palette = suggestions?.palettes[1]
    if (!palette) throw new Error('paleta de teste ausente')
    store.getState().choosePalette(palette)
    expect(store.getState().identityStep).toBe('icon')

    await store.getState().generateIcons('proj-1')
    expect(store.getState().icons).toHaveLength(3)
    expect(store.getState().iconGenerations).toBe(1)
    const iconsCall = transport.calls.find(
      (call) => call.path === GENERATE_PATH && (call.body as { step?: string }).step === 'icons',
    )
    expect(iconsCall?.body).toEqual({
      type: 'identity',
      projectId: 'proj-1',
      step: 'icons',
      name: 'Pulo Jurássico',
      palette,
    })

    store.getState().chooseIcon(1)
    expect(await store.getState().saveIdentity('proj-1')).toBe(true)

    const saveCall = transport.calls.find(
      (call) => call.path === GENERATE_PATH && (call.body as { step?: string }).step === 'save',
    )
    expect(saveCall?.body).toEqual({
      type: 'identity',
      projectId: 'proj-1',
      step: 'save',
      name: 'Pulo Jurássico',
      palette,
      iconSvg: makeIconSvgs()[1],
    })
    // Artefato salvo já vem validated e o funil vira 'done'.
    expect(store.getState().identity?.status).toBe('validated')
    expect(store.getState().identityStep).toBe('done')
    // O nome escolhido vira o nome do PROJETO (PATCH) e o callback recebe o detalhe.
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/projects/proj-1')
    expect(patch?.body).toEqual({ name: 'Pulo Jurássico' })
    expect(updated).toHaveLength(1)
    expect(updated[0]?.name).toBe('Pulo Jurássico')
  })

  it('"ficar sem ícone": save com iconSvg null', async () => {
    const transport = makeIdentityTransport()
    const store = createStageEStore(transport)
    await store.getState().loadStage('cycle-1')
    await store.getState().loadSuggestions('proj-1')
    store.getState().chooseName('Pulo Jurássico')
    const palette = store.getState().suggestions?.palettes[1]
    if (!palette) throw new Error('paleta de teste ausente')
    store.getState().choosePalette(palette)
    await store.getState().generateIcons('proj-1')

    store.getState().chooseIcon(null)
    expect(await store.getState().saveIdentity('proj-1')).toBe(true)

    const saveCall = transport.calls.find(
      (call) => call.path === GENERATE_PATH && (call.body as { step?: string }).step === 'save',
    )
    expect((saveCall?.body as { iconSvg: string | null }).iconSvg).toBeNull()
  })

  it('trocar nome/paleta reseta ícones e o contador de gerações respeita o teto', async () => {
    const transport = makeIdentityTransport()
    const store = createStageEStore(transport)
    await store.getState().loadStage('cycle-1')
    await store.getState().loadSuggestions('proj-1')
    store.getState().chooseName('Pulo Jurássico')
    const palette = store.getState().suggestions?.palettes[0]
    if (!palette) throw new Error('paleta de teste ausente')
    store.getState().choosePalette(palette)
    await store.getState().generateIcons('proj-1')
    await store.getState().generateIcons('proj-1')
    expect(store.getState().iconGenerations).toBe(2)

    // Voltar e trocar a paleta invalida os ícones gerados.
    store.getState().backToPaletteStep()
    store.getState().choosePalette(palette)
    expect(store.getState().icons).toBeNull()
    expect(store.getState().iconGenerations).toBe(0)

    // No teto, generateIcons vira no-op.
    store.setState({ iconGenerations: MAX_ICON_GENERATIONS })
    const before = transport.calls.length
    await store.getState().generateIcons('proj-1')
    expect(transport.calls.length).toBe(before)
  })

  it('erros gentis: suggestions/icons/save falhando não travam o funil', async () => {
    let failing = true
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'e', artifacts: [makeSpecArtifact()] })
      if (failing) throw new PensaApiError('ia caiu', 502, 'PENSA_AI_UNAVAILABLE')
      if (path === GENERATE_PATH && init?.method === 'POST') {
        const body = init.body as { step?: string }
        if (body.step === 'suggestions') return { suggestions: makeIdentitySuggestions() }
        if (body.step === 'icons') return { icons: makeIconSvgs() }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageEStore(transport)
    await store.getState().loadStage('cycle-1')

    failing = true
    await store.getState().loadSuggestions('proj-1')
    expect(store.getState().suggestions).toBeNull()
    expect(store.getState().identityError).not.toBeNull()
    expect(store.getState().identityError).not.toContain('ia caiu')

    failing = false
    await store.getState().loadSuggestions('proj-1')
    expect(store.getState().suggestions).not.toBeNull()
    expect(store.getState().identityError).toBeNull()

    store.getState().chooseName('Pulo Jurássico')
    const palette = store.getState().suggestions?.palettes[0]
    if (!palette) throw new Error('paleta de teste ausente')
    store.getState().choosePalette(palette)

    failing = true
    await store.getState().generateIcons('proj-1')
    expect(store.getState().icons).toBeNull()
    expect(store.getState().identityError).not.toBeNull()

    expect(await store.getState().saveIdentity('proj-1')).toBe(false)
    expect(store.getState().identityStep).toBe('icon')
    expect(store.getState().identityError).not.toBeNull()
  })
})

describe('stageEStore.advance', () => {
  it('POST {from: e} e devolve true; gate reprovado vira advanceError', async () => {
    const transport = createFakeTransport((path, init) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'e' })
      if (path === ADVANCE_PATH && init?.method === 'POST') {
        return { cycle: { id: 'cycle-1', number: 1, goal: null, stage: 'r' } }
      }
      throw new Error(`rota inesperada: ${path}`)
    })
    const store = createStageEStore(transport)
    await store.getState().loadStage('cycle-1')

    expect(await store.getState().advance()).toBe(true)
    const post = transport.calls.find((call) => call.path === ADVANCE_PATH)
    expect(post?.body).toEqual({ from: 'e' })

    const failing = createFakeTransport((path) => {
      if (path === STAGE_PATH) return makeStageView({ stage: 'e' })
      throw new PensaApiError('gate', 409, 'PENSA_GATE_NOT_READY')
    })
    const store2 = createStageEStore(failing)
    await store2.getState().loadStage('cycle-1')
    expect(await store2.getState().advance()).toBe(false)
    expect(store2.getState().advanceError).not.toBeNull()
  })
})
