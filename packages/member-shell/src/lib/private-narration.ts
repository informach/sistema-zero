import type { PensaNarratableRef } from '@sistemazero/core/pensa'

/** Studio narration shares the media service, while its source stays outside the Pensa model. */
export type PrivateNarratableRef =
  | PensaNarratableRef
  | {
      origin: 'studio_message'
      projectId: string
      messageId: string
    }
