import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import type { DialoguePose } from '@sistemazero/member-shell/lib/types'

// As ilustrações são as mesmas da comunidade Kids, empacotadas pelo Next para esta aplicação.
const poses = {
  celebrating: BUILTIN_ART.celebrating.poster,
  happy: BUILTIN_ART.happy.poster,
  speaking: BUILTIN_ART.speaking.poster,
  thinking: BUILTIN_ART.thinking.poster,
} satisfies Record<DialoguePose, { url: string }>

export function lessonZappy(pose: DialoguePose) {
  return (
    <img
      src={(poses[pose] ?? poses.speaking).url}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={80}
      height={80}
      className="size-16 shrink-0 select-none object-contain sm:size-20"
    />
  )
}
