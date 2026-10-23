import { createHash } from 'node:crypto'
import {
  type AssetManifest,
  canonicalJson,
  compositionIdentity,
  compositionSceneClip,
  compositionSceneInput,
  type ExecutionRun,
  type VideoProject,
} from '@sistemazero/marketing-contracts'
import { WorkspaceError } from './workspace-error'

/** Produced files are checked separately; never augment the frozen context with mutable inputs. */
export async function validateCompositionResult(
  run: ExecutionRun,
  next: VideoProject,
  produced: AssetManifest[],
) {
  const source = run.context.source.document
  if (source.kind !== 'video')
    throw new WorkspaceError('INVALID_RESULT', 'A origem não é uma montagem')
  const original = source.timeline
  const reject = (message: string): never => {
    throw new WorkspaceError('INVALID_RESULT', message)
  }
  if (run.request.capability !== 'composition') {
    const recipes = new Set(
      original.clips.flatMap((clip) => (clip.generated ? [canonicalJson(clip.generated)] : [])),
    )
    for (const clip of next.clips) {
      if (clip.generated && !recipes.has(canonicalJson(clip.generated)))
        reject('Use o pedido de animação para alterar o fonte e os parâmetros desta cena')
      if (
        original.clips.some((before) => before.generated && before.assetId === clip.assetId) &&
        !clip.generated
      )
        reject('A prévia precisa conservar seu fonte e parâmetros editáveis')
    }
    for (const before of original.clips.filter((clip) => clip.generated?.protectedText.length)) {
      if (
        !next.clips.some(
          (clip) =>
            clip.id === before.id &&
            canonicalJson(clip.generated ?? null) === canonicalJson(before.generated),
        )
      )
        throw new WorkspaceError('PROTECTED_CONTENT', 'A animação contém copy protegida')
    }
    return []
  }
  const outcome = run.outcome?.status === 'succeeded' ? run.outcome : undefined
  const target = run.request.videoTarget
  const before = original.clips.find((clip) => clip.id === target?.clipId)
  const selected = next.clips.find((clip) => clip.id === target?.clipId)
  if (!before || !selected?.generated || !target || !outcome)
    return reject('Escolha uma cena gráfica e inclua a composição validada')
  const generated = selected.generated
  let base: ReturnType<typeof compositionSceneInput>
  try {
    base = compositionSceneInput(original, before)
  } catch (error) {
    return reject(error instanceof Error ? error.message : 'Cena inválida')
  }
  const expectedInput = {
    ...base,
    title: generated.input.title,
    body: generated.input.body,
    requiredText: [generated.input.title, generated.input.body].filter((text) => text.trim()),
  }
  const protectedText = before.generated?.protectedText ?? before.art?.protectedText ?? []
  if (
    canonicalJson(generated.protectedText) !== canonicalJson(protectedText) ||
    protectedText.some((text) => !generated.input.body.includes(text))
  )
    throw new WorkspaceError('PROTECTED_CONTENT', 'A composição alterou copy protegida')
  if (
    canonicalJson(expectedInput) !== canonicalJson(generated.input) ||
    canonicalJson(compositionSceneClip(before, generated)) !== canonicalJson(selected) ||
    generated.sourceRevisionId !== run.context.source.id ||
    generated.sourceSha256 !== createHash('sha256').update(generated.source).digest('hex') ||
    generated.inputSha256 !==
      (await compositionIdentity(generated.source, generated.input, run.context.assets ?? []))
  )
    reject('A composição não corresponde à cena, ao fonte e às mídias deste pedido')
  if (target.part === 'text' && generated.source !== before.generated?.source)
    reject('Um pedido de texto precisa preservar o fonte da animação')
  if (
    target.part === 'effect' &&
    (generated.input.title !== base.title || generated.input.body !== base.body)
  )
    reject('Um pedido de efeito precisa preservar a copy')
  const output = produced.find((asset) => asset.id === generated.outputAssetId)
  if (
    !output ||
    !outcome.assetIds.includes(output.id) ||
    (run.context.assets ?? []).some((asset) => asset.id === output.id) ||
    output.sha256 !== generated.outputSha256 ||
    output.mime !== 'video/webm' ||
    output.codec !== 'vp9' ||
    output.width !== original.width ||
    output.height !== original.height ||
    output.hasAudio !== false ||
    output.rotation !== 0 ||
    Math.abs(
      (output.durationMs ?? 0) -
        (before.durationInFrames * 1000 * original.fps.denominator) / original.fps.numerator,
    ) > 2
  )
    return reject('A composição exige sua nova prévia WebM confirmada e correspondente ao recibo')
  return [output]
}
