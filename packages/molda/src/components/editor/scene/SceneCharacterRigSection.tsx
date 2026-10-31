import { useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import {
  characterMarkSequence,
  characterRigTarget,
  findCharacterRigs,
} from '../../../scene/characterRig'
import type { MoldaSceneDocument } from '../../../scene/document'
import { Button } from '../../ui/Button'
import { ArrowLeft, Check, PersonStanding, Play, RotateCcw, Trash2, X } from '../../ui/icons'
import { motionChoiceName } from './useCharacterMotion'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** O personagem inteiro: marcar 5 (ou 8) pontos de frente e montar o esqueleto pronto. */
export function SceneCharacterRigSection({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const copy = COPY.scene.characterRig
  const { characterRig, document } = workshop
  const { draft } = characterRig
  const [mirror, setMirror] = useState(true)
  const ready = useMemo(() => findCharacterRigs(document).length > 0, [document])
  const { selected } = workshop
  // Antes de marcar vale a escolha atual; durante, a marcação mostra a dela.
  const replaced = useMemo(() => replacedPieces(document, selected), [document, selected])
  const removal = (
    <div className="space-y-1 border-t border-mld-border pt-3">
      <Button size="compact" className="w-full" onClick={() => characterRig.remove(selected)}>
        <Trash2 aria-hidden="true" className="size-4" />
        {copy.remove}
      </Button>
      <p className="text-xs text-mld-muted">{copy.removeHint}</p>
    </div>
  )
  const begin = () => {
    workshop.rig.cancel()
    characterRig.start(selected, mirror)
  }
  return (
    <section className="space-y-3 rounded-xl border border-mld-border p-3" aria-label={copy.title}>
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <PersonStanding aria-hidden="true" className="size-4" />
        {copy.title}
      </h3>
      {!draft ? (
        ready ? (
          <>
            <p className="flex items-center gap-2 text-sm">
              <Check aria-hidden="true" className="size-4" />
              {characterRig.done ?? copy.ready}
            </p>
            <Button
              size="compact"
              className="w-full"
              onClick={() => workshop.changeMode('animation')}
            >
              <Play aria-hidden="true" className="size-4" />
              {copy.animate}
            </Button>
            <Button size="compact" className="w-full" onClick={begin}>
              <RotateCcw aria-hidden="true" className="size-4" />
              {copy.again}
            </Button>
            {removal}
          </>
        ) : (
          <>
            {characterRig.done && (
              <p role="status" className="flex items-center gap-2 text-sm">
                <Check aria-hidden="true" className="size-4" />
                {characterRig.done}
              </p>
            )}
            <p className="text-xs leading-relaxed text-mld-muted">{copy.intro}</p>
            <p className="text-xs leading-relaxed text-mld-muted">{copy.chooseHint}</p>
            {replaced > 0 && (
              <p role="note" className="rounded-lg bg-mld-bg p-2 text-xs leading-relaxed">
                {copy.replaces(replaced)}
              </p>
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="molda-character-mirror"
                className="size-5 accent-mld-accent"
                checked={mirror}
                onChange={(event) => setMirror(event.target.checked)}
              />
              {copy.mirror}
            </label>
            <Button size="compact" variant="primary" className="w-full" onClick={begin}>
              <PersonStanding aria-hidden="true" className="size-4" />
              {copy.start}
            </Button>
            {replaced > 0 && removal}
          </>
        )
      ) : (
        <SceneCharacterRigSteps workshop={workshop} />
      )}
      {characterRig.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {characterRig.error}
        </p>
      )}
    </section>
  )
}

/** Os passos da marcação, iguais em Ossos e pesos e em Animar. */
export function SceneCharacterRigSteps({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const copy = COPY.scene.characterRig
  const { characterRig, document } = workshop
  const { draft } = characterRig
  const replaced = useMemo(
    () => (draft ? replacedPieces(document, draft.ids) : 0),
    [document, draft],
  )
  if (!draft) return null
  const sequence = characterMarkSequence(draft.mirror)
  const next = draft.layout ? undefined : sequence[draft.points.length]
  return (
    <>
      {/* Ajustando ossos que já existem, os pontos já vêm marcados: o aviso vale desde o começo. */}
      {replaced > 0 && (
        <p role="note" className="rounded-lg bg-mld-bg p-2 text-xs leading-relaxed">
          {copy.replaces(replaced)}
        </p>
      )}
      {draft.layout ? (
        <p role="status" className="text-sm">
          {copy.preview}
        </p>
      ) : (
        <>
          <p role="status" className="text-sm font-bold">
            {!draft.mirror && draft.points.length === 5 ? `${copy.otherSide} ` : ''}
            {next ? copy.marks[next] : ''}
          </p>
          <p className="text-xs text-mld-muted">
            {copy.progress(draft.points.length + 1, sequence.length)} · {copy.markHint}
          </p>
        </>
      )}
      {characterRig.wanted && (
        <p className="text-xs text-mld-muted">
          {copy.thenMotion(motionChoiceName(characterRig.wanted))}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {draft.layout && (
          <Button size="compact" variant="primary" onClick={() => characterRig.confirm()}>
            <Check aria-hidden="true" className="size-4" />
            {copy.confirm}
          </Button>
        )}
        <Button size="compact" disabled={!draft.points.length} onClick={characterRig.back}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          {copy.back}
        </Button>
        {draft.layout && (
          <Button size="compact" onClick={characterRig.restart}>
            <RotateCcw aria-hidden="true" className="size-4" />
            {copy.restart}
          </Button>
        )}
        <Button size="compact" onClick={characterRig.cancel}>
          <X aria-hidden="true" className="size-4" />
          {copy.cancel}
        </Button>
      </div>
    </>
  )
}

/** Peças escolhidas que já têm ossos e perderão os de antes. */
function replacedPieces(document: MoldaSceneDocument, ids: readonly string[]) {
  try {
    return characterRigTarget(document, ids).replaced
  } catch {
    return 0
  }
}
