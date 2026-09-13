import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS, type SceneId } from '@sistemazero/core/learning/scene'
import { ExperienceConnection } from '@sistemazero/member-shell/components/experience-connection'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

afterEach(cleanup)
function renderMission(
  scene: SceneId,
  type: 'experimentation' | 'demonstration' = 'experimentation',
) {
  const modelo = SCENE_MODELS[scene]
  const content: InteractiveBlock = {
    kind: 'interactive',
    title: modelo.title,
    instructions: modelo.instruction,
    hints: [...modelo.hints],
    required: false,
    activity: { type, scene },
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
    fireEvent.click(screen.getByRole('button', { name: 'Guardar para comparar' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '60' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(
      (screen.getByRole('slider', { name: 'Distância do cacto' }) as HTMLInputElement).value,
    ).toBe('25')
    fireEvent.change(screen.getByRole('slider', { name: 'Distância do cacto' }), {
      target: { value: '60' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Largura da área do Dino' }), {
      target: { value: '100' },
    })
    expect(screen.getByText('Experiência guardada')).toBeTruthy()
    expect(screen.getByText(SCENE_MODELS.hitbox.success)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Desfazer' }).closest('fieldset')?.disabled).toBe(
      true,
    )
    expect(screen.queryByRole('button', { name: 'Ver um exemplo' })).toBeNull()
    expect(screen.queryByText(SCENE_MODELS.hitbox.extra)).toBeNull()
    await waitFor(() => expect(screen.getByText('Descoberta registrada.')).toBeTruthy(), {
      timeout: 2500,
    })
  })
  test('a demonstration offers playback only and cannot turn into an experiment', () => {
    renderMission('hitbox', 'demonstration')
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eu quero experimentar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Uma pista' })).toBeNull()
    expect(screen.queryByText('Arraste o cacto. Ou use o controle de distância abaixo.')).toBeNull()
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Um passo' }))
    expect(screen.getByRole('button', { name: 'Próxima etapa' }).hasAttribute('disabled')).toBe(
      false,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Rever desde o começo' }))
    expect(screen.getByRole('button', { name: 'Próxima etapa' }).hasAttribute('disabled')).toBe(
      true,
    )
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
