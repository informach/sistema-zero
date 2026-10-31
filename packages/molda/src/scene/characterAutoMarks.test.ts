import { expect, test } from 'bun:test'
import { makeCharacterFixture } from '../testing/characterFixture'
import { guessCharacterMarks } from './characterAutoMarks'
import { buildCharacterRig, findCharacterRigs, layoutCharacterSkeleton } from './characterRig'
import { addScenePrimitive } from './commands'
import { createSceneProject } from './createProject'
import { setScenePieceCoordinates } from './pieceCoordinates'
import { SceneValidationError } from './validation'

test('a silhueta de frente acha os 5 pontos perto de onde a pessoa marcaria', () => {
  const { document, group, marks } = makeCharacterFixture()
  const guessed = guessCharacterMarks(document, [group])
  expect(guessed).toHaveLength(5)
  const near = [0.05, 0.05, 0.12, 0.12, 0.05]
  guessed.forEach((point, index) => {
    expect(Math.abs(point[0] - marks[index]![0])).toBeLessThan(near[index]!)
    expect(Math.abs(point[1] - marks[index]![1])).toBeLessThan(near[index]!)
  })
  const layout = layoutCharacterSkeleton(document, [group], guessed, true)
  const { document: rigged } = buildCharacterRig(document, [group], layout)
  expect(findCharacterRigs(rigged)).toHaveLength(1)
})

test('uma placa larga e fina é recusada na hora, sem montar uma grade enorme', () => {
  let plate = addScenePrimitive(createSceneProject({ kind: 'empty', name: 'Rua' }), 'box', 'rua')
  const id = plate.nodes.at(-1)!.id
  plate = setScenePieceCoordinates(plate, id, 'dimensions', [32, 0.01, 4])
  const started = performance.now()
  expect(() => guessCharacterMarks(plate, [])).toThrow(SceneValidationError)
  expect(performance.now() - started).toBeLessThan(200)
})

test('o que não parece um corpo é recusado, para a pessoa marcar à mão', () => {
  const cube = addScenePrimitive(createSceneProject({ kind: 'empty', name: 'Cubo' }), 'box', 'cubo')
  expect(() => guessCharacterMarks(cube, [])).toThrow(SceneValidationError)
})
