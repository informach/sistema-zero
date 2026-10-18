import { type DragEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SceneHierarchyOrganization } from './useSceneHierarchyOrganization'

const DRAG_TYPE = 'application/x-molda-hierarchy'

export function useSceneHierarchyDrag(
  owner: object,
  selected: readonly string[],
  organization?: SceneHierarchyOrganization,
) {
  const pending = useRef<{
    owner: object
    plan: ReturnType<SceneHierarchyOrganization['prepareMove']>
    move: SceneHierarchyOrganization['move']
  } | null>(null)
  const [target, setTarget] = useState<string | null | undefined>()
  const [active, setActive] = useState(false)
  const enabled = !!organization
  const clear = useCallback(() => {
    pending.current = null
    setActive(false)
    setTarget(undefined)
  }, [])
  useLayoutEffect(() => {
    if (pending.current && (pending.current.owner !== owner || !enabled)) clear()
  }, [owner, enabled, clear])
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) clear()
    }
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [clear])
  function allows(parentId: string | null) {
    const drag = pending.current
    return !!organization && drag?.owner === owner && drag.plan.allows(parentId)
  }
  return {
    target: organization && pending.current?.owner === owner ? target : undefined,
    active: active && !!organization && pending.current?.owner === owner,
    start(event: DragEvent, id: string) {
      const plan = organization?.prepareMove(selected.includes(id) ? selected : [id])
      if (!plan?.editable || !organization) {
        event.preventDefault()
        return
      }
      pending.current = { owner, plan, move: organization.move }
      setActive(true)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(DRAG_TYPE, id)
    },
    end: clear,
    over(event: DragEvent, parentId: string | null) {
      event.stopPropagation()
      if (!event.dataTransfer.types.includes(DRAG_TYPE) || !allows(parentId)) {
        event.dataTransfer.dropEffect = 'none'
        setTarget(undefined)
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setTarget(parentId)
    },
    leave(event: DragEvent) {
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      )
        setTarget(undefined)
    },
    drop(event: DragEvent, parentId: string | null) {
      event.preventDefault()
      event.stopPropagation()
      const drag = pending.current
      const accepted = event.dataTransfer.types.includes(DRAG_TYPE) && allows(parentId)
      clear()
      return accepted && drag ? drag.move(drag.plan.ids, parentId) : false
    },
  }
}
