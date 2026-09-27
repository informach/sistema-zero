import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS, type SceneId } from '@sistemazero/core/learning/scene'
import { ExperienceConnection } from '@sistemazero/member-shell/components/experience-connection'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const matchMediaOriginal = window.matchMedia
afterEach(() => {
  cleanup()
  window.matchMedia = matchMediaOriginal
})
function renderMission(scene: SceneId) {
  const modelo = SCENE_MODELS[scene]
  const content: InteractiveBlock = {
    kind: 'interactive',
    title: modelo.title,
    instructions: modelo.instruction,
    hints: [...modelo.hints],
    required: false,
    activity: { type: 'experimentation', scene },
  }
  return render(
    <InteractiveLessonBlock
      block={{
        id: 'experience',
        blockRevision: 'revision',
        kind: 'interactive',
        sortOrder: 0,
        content,
      }}
      previewContent={content}
    />,
  )
}
describe('o laboratório da cena', () => {
  test('contact, same-position area comparison and undo work through accessible controls', async () => {
    renderMission('hitbox')
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '25' },
    })
    // ⚠️ Mudou de propósito (lote 2): "Guardar para comparar" virou "Guardar este jeito".
    fireEvent.click(screen.getByRole('button', { name: 'Guardar este jeito' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '60' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(
      (screen.getByRole('slider', { name: 'Distância do cacto' }) as HTMLInputElement).value,
    ).toBe('25')
    // A área abre em 100%: comparar 80% revela o primeiro contraste. Em 40%, a área fica
    // pequena demais e deixa de marcar uma batida visível, a terceira descoberta da cena.
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '50' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Tamanho da área do Dino' }), {
      target: { value: '80' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '40' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Tamanho da área do Dino' }), {
      target: { value: '40' },
    })
    expect(screen.getByText('Experiência guardada')).toBeTruthy()
    expect(screen.getByText(SCENE_MODELS.hitbox.success)).toBeTruthy()
    // ⚠️ Cumprir o objetivo NÃO encerra a cena (14/09/2026). O `<fieldset disabled>` que
    // travava tudo aqui desabilitava também Recomeçar, Uma pista e Ligar som — e ao reabrir a
    // aula a cena já nascia morta, porque o checkpoint salvo faz `passed` nascer true. A
    // criança que acertou apertando botão de qualquer jeito precisa poder refazer.
    // ⚠️ `button.disabled` NÃO reflete a herança do `<fieldset disabled>`: quem morde é o
    // fieldset. Os quatro botões são conferidos por ele, um a um.
    // ⚠️ Mudou de propósito (lote 2): `hitbox` não faz som, e as ferramentas moram FORA do fieldset
    // da cena, então a asserção olha se há algum fieldset DESABILITADO acima delas.
    for (const nome of ['Desfazer', 'Recomeçar'])
      expect(screen.getByRole('button', { name: nome }).closest('fieldset[disabled]')).toBeNull()
    // ⚠️ Mudou de propósito (consertos do review do lote 2): "Uma pista" some ao concluir (era um
    // clique mudo que ainda contava pista para o professor).
    expect(screen.queryByRole('button', { name: 'Uma pista' })).toBeNull()
    // E continuam FUNCIONANDO: o guard dos comandos também olhava o `passed`, então destravar
    // só o fieldset deixaria os botões clicáveis e mudos.
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(
      (screen.getByRole('slider', { name: 'Tamanho da área do Dino' }) as HTMLInputElement).value,
    ).not.toBe('40')
    expect(screen.queryByRole('button', { name: 'Ver um exemplo' })).toBeNull()
    expect(screen.queryByText(SCENE_MODELS.hitbox.extra)).toBeNull()
    // ⚠️ Mudou de propósito (lote 2): o cartão "Descoberta registrada." saiu. Sem pergunta anexa no
    // bloco, a conclusão diz "Você descobriu!" e a regra da cena logo embaixo.
    expect(screen.getByText('Você descobriu!', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText('Prévia: nada é guardado.')).toBeTruthy()
  })
  test('connection can be cancelled with Escape and completed with two activations', () => {
    let connected = false
    render(
      <ExperienceConnection
        source="Som"
        target="Pulou"
        alternative="Desligar"
        enabled={false}
        onConnect={(value) => {
          connected = value
        }}
      />,
    )
    const source = screen.getByRole('button', { name: '◉ Som' })
    fireEvent.click(source)
    fireEvent.keyDown(source, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: '◎ Pulou' }))
    expect(connected).toBe(false)
    fireEvent.click(source)
    fireEvent.click(screen.getByRole('button', { name: '◎ Pulou' }))
    expect(connected).toBe(true)
  })
})
