import {
  type CaptureObservation,
  type CapturePlan,
  captureObservationSchema,
} from '@sistemazero/marketing-contracts'
import type { WebContents } from 'electron'
import { abortable } from '../abortable'

/** Consumes Studio's opt-in read-only diagnostics, without patching runtime functions. */
export async function readCaptureObservation(
  contents: WebContents,
  signal: AbortSignal,
): Promise<CaptureObservation> {
  return captureObservationSchema.parse(
    await abortable(
      contents.executeJavaScript(`(()=>{
  const inspect=window.__SZSTUDIO_RUNTIME_INSPECTORS?.['game-2d-advanced:battle'];
  const raw=typeof inspect==='function'?inspect():null;
  const snap=c=>({name:c.name,hp:c.hp,max:c.max,energy:c.energy,availableMoves:c.availableMoves,alive:c.alive,x:c.x,y:c.y,w:c.w,h:c.h});
  const battle=raw?{phase:raw.phase,actor:raw.actor,menuIndex:raw.menuIndex,menuLabels:raw.menuLabels,allies:raw.allies.map(snap),foes:raw.foes.map(snap)}:null;
  const element=document.querySelector('canvas'),rect=element?.getBoundingClientRect();
  return {battle,canvas:element&&rect&&rect.width&&rect.height?{x:rect.x,y:rect.y,width:rect.width,height:rect.height,pixelWidth:element.width,pixelHeight:element.height}:null};
 })()`),
      signal,
    ),
  )
}
export async function captureBattle(
  contents: WebContents,
  step: Extract<CapturePlan['steps'][number], { action: 'battle' }>,
  frames: (count: number) => Promise<void>,
  signal: AbortSignal,
) {
  const key = async (keyCode: string) => {
    signal.throwIfAborted()
    contents.sendInputEvent({ type: 'keyDown', keyCode })
    try {
      await frames(2)
    } finally {
      if (!contents.isDestroyed()) contents.sendInputEvent({ type: 'keyUp', keyCode })
    }
    await frames(1)
  }
  const observations: CaptureObservation[] = []
  for (let turn = 0; turn < step.maxTurns; turn++) {
    let observed = await readCaptureObservation(contents, signal)
    for (let count = 0; observed.battle?.phase !== 'escolha' && count < 300; count++) {
      if (!observed.battle)
        throw new Error('A batalha não está ativa. Descreva primeiro como chegar ao encontro.')
      await frames(1)
      observed = await readCaptureObservation(contents, signal)
    }
    const battle = observed.battle,
      hero = battle?.allies.find((actor) => actor.name === battle.actor && actor.alive)
    if (battle?.phase !== 'escolha' || !hero)
      throw new Error('A batalha não chegou a um turno jogável dentro do limite')
    const target = battle.foes.find((actor) => actor.name === step.target)
    if (!target) throw new Error(`O adversário ${step.target} não está na batalha observada`)
    if (target.hp > 0 && target.hp / target.max < step.lifeBelow) return observations
    const matching = (prefix: string) =>
      battle.menuLabels.findIndex(
        (label) =>
          label === prefix || label.startsWith(`${prefix} `) || label.startsWith(`${prefix} (`),
      )
    const healing =
      hero.hp / hero.max < step.healBelow &&
      matching(step.heal) >= 0 &&
      hero.availableMoves.some(
        (move) => move.name === step.heal && move.heal && move.cost <= hero.energy,
      )
    const move = healing ? step.heal : step.attack,
      index = matching(move)
    if (index < 0) throw new Error(`A ação ${move} não está disponível no menu observado`)
    const ability = hero.availableMoves.find((candidate) => candidate.name === move)
    if (!ability || ability.cost > hero.energy)
      throw new Error(
        `O personagem não tem energia para ${move}; peça uma ação disponível neste turno`,
      )
    const down = (index - battle.menuIndex + battle.menuLabels.length) % battle.menuLabels.length
    for (let index = 0; index < down; index++) await key('Down')
    await key('Space')
    observed = await readCaptureObservation(contents, signal)
    if (observed.battle?.phase === 'mira') {
      const canvas = observed.canvas
      const candidate = healing
        ? observed.battle.allies.find((actor) => actor.name === hero.name && actor.alive)
        : (observed.battle.foes.find((actor) => actor.alive && actor.name !== step.target) ??
          observed.battle.foes.find((actor) => actor.name === step.target && actor.alive))
      if (!candidate || !canvas) throw new Error('O alvo não está disponível na superfície do jogo')
      const position = {
        x: Math.round(
          canvas.x + ((candidate.x + candidate.w / 2) * canvas.width) / canvas.pixelWidth,
        ),
        y: Math.round(
          canvas.y + ((candidate.y + candidate.h / 2) * canvas.height) / canvas.pixelHeight,
        ),
        button: 'left' as const,
        clickCount: 1,
      }
      contents.sendInputEvent({ ...position, type: 'mouseDown' })
      contents.sendInputEvent({ ...position, type: 'mouseUp' })
      await frames(2)
      observed = await readCaptureObservation(contents, signal)
    }
    observations.push(observed)
    const foe = observed.battle?.foes.find((actor) => actor.name === step.target)
    if (foe && foe.hp > 0 && foe.hp / foe.max < step.lifeBelow) return observations
  }
  throw new Error(
    'O estado solicitado não foi atingido nos turnos permitidos; nenhuma captura foi apresentada como concluída',
  )
}
