import { ZappyAnimated } from '@sistemazero/member-shell/components/lesson-ui/mascot-animated'
import type { DialoguePose } from '@sistemazero/member-shell/lib/types'

export function lessonZappy(pose: DialoguePose) {
  return <ZappyAnimated expression={pose} className="size-16 sm:size-24" />
}
