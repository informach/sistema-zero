'use client'
import { initialIsland } from '@sistemazero/core/learning/scene'
import { useEffect, useState } from 'react'
import { Note } from './scene-discovery-frame'
import { IslandWorld } from './scene-island-world'

/** The demonstration is identical for every answer. The server grades the choice. */
export function IslandQuizScene({
  scene,
  result,
  onAnimating,
}: {
  scene: string
  result: boolean
  onAnimating: (v: boolean) => void
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    onAnimating(!ready)
  }, [ready, onAnimating])
  const state = initialIsland(
    scene === 'island-view' ? [] : scene === 'island-position' ? ['axis-x'] : ['contact-apart'],
  )
  let before = '',
    after = ''
  if (scene === 'island-view') {
    before = 'A chave está atrás da pedra. Vamos olhar de lado.'
    after = 'Mudou a câmera. A chave e a pedra ficaram no mesmo lugar.'
    if (result) state.view = 'side'
  } else if (scene === 'island-position') {
    before = 'Vamos mudar x de −2 para 3, mantendo y em 1 e z em −3.'
    after = 'A chave mudou de lugar no chão. A altura continuou em 1.'
    if (result) {
      state.before = { ...state.key }
      state.key.x = 3
    }
  } else if (scene === 'island-height') {
    before = 'De cima, as imagens parecem juntas. Vamos olhar de lado.'
    after = 'A chave está acima do personagem. As áreas de contato estão separadas.'
    if (result) {
      state.view = 'side'
      state.bounds = true
    }
  } else {
    state.key = { x: 2, y: 1, z: 1 }
    state.view = 'front'
    before = 'A chave mudou de lugar. Vamos levar o personagem até ela e testar o encontro.'
    after = 'O personagem chegou ao novo lugar. As áreas se encontram: a chave pode ser recolhida.'
    if (result) {
      state.hero.x = 2
      state.bounds = true
    }
  }
  return (
    <div className="sz-discovery-quiz-scene" aria-live="polite">
      <IslandWorld state={state} onReady={setReady} />
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{result ? after : before}</Note>
    </div>
  )
}
