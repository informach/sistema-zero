import type { DialoguePose } from '@sistemazero/member-shell/lib/types'
import celebrating from '../../../../community-kids/public/zappy/celebrating.webp'
import happy from '../../../../community-kids/public/zappy/happy.webp'
import speaking from '../../../../community-kids/public/zappy/speaking.webp'
import thinking from '../../../../community-kids/public/zappy/thinking.webp'

// As ilustrações são as mesmas da comunidade Kids, empacotadas pelo Next para esta aplicação.
const poses = { celebrating, happy, speaking, thinking } satisfies Record<
  DialoguePose,
  { src: string }
>

export function lessonZappy(pose: DialoguePose) {
  return (
    <img
      src={(poses[pose] ?? speaking).src}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={80}
      height={80}
      className="size-16 shrink-0 select-none object-contain sm:size-20"
    />
  )
}
