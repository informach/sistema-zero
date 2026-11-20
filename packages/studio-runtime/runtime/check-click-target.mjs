// Input geometry only. No answer, grading predicate or student-state mutation belongs here.
// As funções que rodam na página e a geometria do gesto têm UMA fonte, a do Estúdio
// (`studio/src/check/clickTargetInPage.ts`), que o piloto de "Meus testes" injeta no jogo; aqui
// elas chegam pelo módulo gerado (`scripts/validation-profile.ts`).
import {
  CLICK_TARGET_LIMITS,
  chooseTargetPoint,
  createClickTargetReaderInPage,
  readStageGeometryInPage,
  stagePointToViewport,
} from './click-target.generated.mjs'

export {
  CLICK_TARGET_LIMITS,
  chooseTargetPoint,
  createClickTargetReaderInPage,
  readStageGeometryInPage,
  stagePointToViewport,
}

/** One private handle and one existing page. No answer/threshold enters the game. */
export async function observeSpriteMotion(probe, { scope, target, idleMs }, idle, act) {
  const positions = await probe.handle(createClickTargetReaderInPage, {
    scope,
    ...CLICK_TARGET_LIMITS,
  })
  let primary, result
  let failed = false
  try {
    const baselineInitial = await positions.position(target)
    await idle(idleMs)
    const baselineFinal = await positions.position(target)
    const actionInitial = await positions.position(target)
    await act()
    const actionFinal = await positions.position(target)
    result = {
      initial: { found: true, value: actionInitial[target.axis] },
      final: { found: true, value: actionFinal[target.axis] },
      motion: { baselineInitial, baselineFinal, actionInitial, actionFinal },
    }
  } catch (error) {
    primary = error
    failed = true
  }
  try {
    await positions.dispose()
  } catch (cleanupError) {
    if (failed)
      throw new AggregateError([primary, cleanupError], 'A observação e sua liberação falharam.')
    throw cleanupError
  }
  if (failed) throw primary
  return result
}
/**
 * Host-only CDP owner. Paths remain references; values are never serialized through page code.
 * Metadata is checked before the next descriptor read, so a Proxy never reaches ownData.
 */
export async function createClickTargetHandle(cdp, factory, arg) {
  const objectGroup = `sz-click-target-${globalThis.crypto.randomUUID()}`
  const release = () => cdp.send('Runtime.releaseObjectGroup', { objectGroup })
  const replyError = (reply) => {
    if (reply.exceptionDetails)
      throw new Error(
        reply.exceptionDetails.exception?.description?.split('\n')[0] ??
          'Falha ao observar o alvo.',
      )
    return reply.result
  }
  try {
    const initial = replyError(
      await cdp.send('Runtime.evaluate', {
        expression: `(${factory.toString()})(${JSON.stringify(arg)})`,
        returnByValue: false,
        awaitPromise: false,
        generatePreview: false,
        objectGroup,
      }),
    )
    const objectId = initial?.objectId
    if (!objectId || initial.subtype === 'proxy')
      throw new Error('Não foi possível observar os alvos do gesto.')
    const invoke = async (method, args, returnByValue) =>
      replyError(
        await cdp.send('Runtime.callFunctionOn', {
          objectId,
          functionDeclaration:
            'function(method, first, second, third) { return this[method](first, second, third) }',
          arguments: [{ value: method }, ...args],
          returnByValue,
          awaitPromise: false,
          generatePreview: false,
          objectGroup,
        }),
      )
    const observable = (value) => {
      if (value?.subtype === 'proxy')
        throw new Error('O alvo contém um Proxy e não pode ser observado sem executar o programa.')
      if (!value?.objectId || (value.type !== 'object' && value.type !== 'function'))
        throw new Error('O alvo não contém um objeto diretamente observável.')
      return value
    }
    const partsOf = (path) => {
      if (typeof path !== 'string') throw new Error('Caminho de alvo inválido.')
      const parts = path.split('.')
      if (
        parts.length > 4 ||
        parts.some((part) => !part || ['__proto__', 'prototype', 'constructor'].includes(part))
      )
        throw new Error('Caminho de alvo inválido.')
      return parts
    }
    const resolveParts = async (parts) => {
      const box = observable(await invoke('root', [{ value: parts[0] }], false))
      let value = observable(
        await invoke('ownValue', [{ objectId: box.objectId }, { value: 'v' }], false),
      )
      for (const part of parts.slice(1))
        value = observable(
          await invoke('ownValue', [{ objectId: value.objectId }, { value: part }], false),
        )
      return value
    }
    return {
      resolve: async (path) => resolveParts(partsOf(path)),
      call: async (method, value) => (await invoke(method, [{ value }], true))?.value,
      bounds: async (path) => {
        const actor = await resolveParts(partsOf(path))
        return (await invoke('bounds', [{ objectId: actor.objectId }], true))?.value
      },
      position: async (target) => {
        const actor = await resolveParts(partsOf(target.path))
        return (await invoke('position', [{ objectId: actor.objectId }], true))?.value
      },
      read: async (target) => {
        const paths = (await invoke('paths', [{ value: target }], true))?.value
        const groupParts = partsOf(paths?.groupPath)
        const actorParts = paths.actorPath === null ? null : partsOf(paths.actorPath)
        const group = await resolveParts(groupParts)
        const actor = actorParts ? await resolveParts(actorParts) : null
        return (
          await invoke(
            'read',
            [
              { value: target },
              { objectId: group.objectId },
              actor ? { objectId: actor.objectId } : { value: null },
            ],
            true,
          )
        )?.value
      },
      dispose: release,
    }
  } catch (error) {
    try {
      await release()
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'A observação e sua liberação falharam.')
    }
    throw error
  }
}
