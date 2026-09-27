import { useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_SKIN_LIMITS, type SceneSkinBinding } from '../../../scene/skin'
import { sceneSkinJointUsage } from '../../../scene/skinJoints'
import { Button } from '../../ui/Button'

export function SceneSkinJointTools({
  skin,
  nodes,
  disabled,
  onReview,
}: {
  skin: SceneSkinBinding
  nodes: readonly { id: string; name: string }[]
  disabled: boolean
  onReview(kind: 'addJoint' | 'removeJoint', jointId: string): void
}) {
  const usage = useMemo(() => sceneSkinJointUsage(skin), [skin]),
    choices = useMemo(() => nodes.filter((node) => !usage.has(node.id)), [nodes, usage]),
    names = useMemo(() => new Map(nodes.map((node) => [node.id, node.name])), [nodes]),
    [chosen, setChosen] = useState(''),
    valid = choices.some((node) => node.id === chosen),
    copy = COPY.scene.skinBinding
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-bold">{copy.joints}</legend>
      <ul className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-mld-border p-2">
        {skin.joints.map((joint) => {
          const count = usage.get(joint.nodeId)!.positive,
            name = names.get(joint.nodeId) ?? joint.nodeId
          return (
            <li
              key={joint.nodeId}
              className="space-y-1 border-b border-mld-border pb-2 last:border-b-0"
            >
              <p className="break-words text-sm font-bold">{name}</p>
              <p className="text-xs text-mld-muted">
                {count ? copy.jointInUse(count) : copy.jointUnused}
              </p>
              <Button
                className="w-full text-sm"
                disabled={count > 0}
                aria-label={copy.removeJointNamed(name)}
                onClick={() => onReview('removeJoint', joint.nodeId)}
              >
                {copy.removeJoint}
              </Button>
            </li>
          )
        })}
      </ul>
      {skin.joints.length >= SCENE_SKIN_LIMITS.joints ? (
        <p className="text-sm text-mld-muted">{copy.jointLimit(SCENE_SKIN_LIMITS.joints)}</p>
      ) : !choices.length ? (
        <p className="text-sm text-mld-muted">{copy.noNewJoints}</p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            {copy.chooseNewJoint}
            <select
              name="skin-add-joint"
              value={valid ? chosen : ''}
              onChange={(event) => setChosen(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
            >
              <option value="">{copy.chooseNewJointPlaceholder}</option>
              {choices.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            className="w-full text-sm"
            disabled={!valid}
            onClick={() => onReview('addJoint', chosen)}
          >
            {copy.addJoint}
          </Button>
        </>
      )}
    </fieldset>
  )
}
