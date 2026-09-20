import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  type DemonstrationActivity,
  isSceneScript,
  SCENE_COMPARISONS,
  SCENE_IDS,
  SCENE_MODELS,
  sceneScript,
  sceneShowsComparison,
} from '@sistemazero/core/learning/scene'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SceneAuthoring } = await import('../src/components/editor/scene-authoring')

test('o roteiro abre em campos, sem JSON, e uma edição não derruba as outras etapas', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity: DemonstrationActivity = { type: 'demonstration', scene: 'world' }
  const render = () =>
    root.render(
      <SceneAuthoring
        activity={activity}
        onChange={(next) => {
          activity = next
          render()
        }}
      />,
    )
  try {
    for (const scene of SCENE_IDS.filter((id) => SCENE_MODELS[id].script.length > 0)) {
      activity = { type: 'demonstration', scene }
      await act(async () => render())
      // O roteiro que vem com a cena tem que abrir VÁLIDO: um alerta aqui é a professora
      // recebendo um erro por algo que ela não escreveu.
      expect(container.querySelector('[role="alert"]')).toBeNull()
      const original = sceneScript(activity)
      const selects = [
        ...container.querySelectorAll<HTMLSelectElement>('select[aria-label^="Ação "]'),
      ]
      expect(selects.length).toBe(original.flatMap((s) => s.actions).length)
      expect(
        selects.every((s) => !s.selectedOptions[0]?.textContent?.includes('incompatível')),
      ).toBe(true)
      // Escolher a mesma ação já selecionada é uma edição de verdade no formulário: os números
      // têm que continuar válidos e as OUTRAS etapas têm que sobreviver à atualização.
      await act(async () => selects[0]!.dispatchEvent(new Event('change', { bubbles: true })))
      expect(isSceneScript(sceneScript(activity), scene)).toBe(true)
      expect(sceneScript(activity).slice(1)).toEqual(original.slice(1))
      // ⚠️ A caixa de JSON não existe mais: era o único caminho para algumas edições e pedia
      // da professora uma forma que ela não tem como conhecer.
      expect(container.querySelector('textarea[aria-label*="JSON"]')).toBeNull()
    }
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('⚠️ editar o roteiro que vem com a cena cria um roteiro AUTORAL, e dá para voltar atrás', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity: DemonstrationActivity = { type: 'demonstration', scene: 'world' }
  const render = () =>
    root.render(
      <SceneAuthoring
        activity={activity}
        onChange={(next) => {
          activity = next
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    expect(activity.script).toBeUndefined()
    const fala = container.querySelector<HTMLTextAreaElement>('textarea')
    if (!fala) throw new Error('Faltou o campo de fala.')
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(fala, 'O Dino aparece aqui.')
      fala.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(activity.script?.[0]?.caption).toBe('O Dino aparece aqui.')
    expect(activity.script?.length).toBe(SCENE_MODELS.world.script.length)
    const voltar = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Voltar ao roteiro da cena',
    )
    if (!voltar) throw new Error('Faltou o botão de voltar.')
    await act(async () => voltar.click())
    expect(activity.script).toBeUndefined()
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('⚠️ o editor do caso AVISA quando um salto não sai do chão (o motor o abre sem salto)', async () => {
  // Review do lote 1: o admin oferece "Pular" no caso, e desde o conserto da Aula 3 o motor desfaz
  // em silêncio o salto que não subiu nem um pixel. O caso segue aceito; o professor é avisado.
  const { saltoParadoNoCaso } = await import('../src/lib/scene-authoring-rules')
  expect(saltoParadoNoCaso('gravity', [{ type: 'jump', input: 'tap' }])).toBe(true)
  expect(
    saltoParadoNoCaso('gravity', [
      { type: 'jump', input: 'tap' },
      { type: 'advance', seconds: 0.3 },
    ]),
  ).toBe(false)
  expect(saltoParadoNoCaso('gravity', [{ type: 'impulse', force: 12 }])).toBe(false)
  expect(saltoParadoNoCaso('gravity', undefined)).toBe(false)

  const { SceneSetupEditor } = await import('../src/components/editor/scene-setup-editor')
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(
      <SceneSetupEditor
        activity={{
          type: 'experimentation',
          scene: 'gravity',
          setup: { actions: [{ type: 'jump', input: 'tap' }] },
        }}
        onChange={() => {}}
      />,
    ),
  )
  expect(container.textContent).toContain('Um salto no caso só aparece com o relógio depois dele.')
  await act(async () =>
    root.render(
      <SceneSetupEditor
        activity={{ type: 'experimentation', scene: 'velocity' }}
        onChange={() => {}}
      />,
    ),
  )
  // A missão de fábrica da `velocity` é a do lado: as metas só de caso ficam fora da contagem.
  expect(container.textContent).toContain('cobra as 3 descobertas do modelo')
  expect(container.textContent).toContain('só vale marcada')
  await act(async () => root.unmount())
  container.remove()
})

test('⚠️ o tempo que não cai em quadro inteiro aparece como aviso na etapa (review do lote 4)', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const aviso =
    'Nesta cena um quadro dura 1 s: 0,5 s não mostra nada nesta etapa. Use pelo menos 1 s.'
  try {
    const comAviso: DemonstrationActivity = {
      type: 'demonstration',
      // ⚠️ Mudou de propósito (lote 5 do Raio-X, G6): era a `pool`, que passou a 10 quadros por segundo.
      scene: 'entity-state',
      script: [
        { id: 'step-1', caption: 'O relógio anda.', actions: [{ type: 'advance', seconds: 0.5 }] },
      ],
    }
    await act(async () => root.render(<SceneAuthoring activity={comAviso} onChange={() => {}} />))
    expect(container.textContent).toContain(aviso)
    // O roteiro de fábrica da mesma cena não avisa nada.
    await act(async () =>
      root.render(
        <SceneAuthoring
          activity={{ type: 'demonstration', scene: 'entity-state' }}
          onChange={() => {}}
        />,
      ),
    )
    expect(container.textContent).not.toContain('Nesta cena um quadro dura')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('⚠️⚠️ "Comparação" só aparece onde o player desenha a comparação (`SCENE_COMPARISONS`)', async () => {
  // Full review de 16/09/2026: a lista daqui oferecia "Comparação" em quatro cenas e o player só
  // desenhava na `hitbox`. O professor escolhia o destaque na `gravity` e a criança não via nada.
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const opcaoComparar = (etapa: number) =>
    container.querySelector<HTMLOptionElement>(
      `select[aria-label="Destaque da etapa ${etapa}"] option[value="compare"]`,
    )
  try {
    for (const scene of SCENE_IDS) {
      await act(async () =>
        root.render(
          <SceneAuthoring activity={{ type: 'demonstration', scene }} onChange={() => {}} />,
        ),
      )
      expect(opcaoComparar(1) !== null).toBe(sceneShowsComparison(scene))
    }
    expect([...SCENE_COMPARISONS]).toEqual(['hitbox'])
    // Um roteiro antigo com `compare` numa cena sem comparação continua VÁLIDO (abre), e o editor
    // mostra a opção fechada com o aviso para trocar.
    const antigo: DemonstrationActivity = {
      type: 'demonstration',
      scene: 'gravity',
      script: sceneScript({ type: 'demonstration', scene: 'gravity' }).map((passo, i) =>
        i === 0 ? { ...passo, highlight: 'compare' as const } : passo,
      ),
    }
    expect(isSceneScript(antigo.script, 'gravity')).toBe(true)
    await act(async () => root.render(<SceneAuthoring activity={antigo} onChange={() => {}} />))
    expect(opcaoComparar(1)?.disabled).toBe(true)
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Esta cena não mostra comparação lado a lado',
    )
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
