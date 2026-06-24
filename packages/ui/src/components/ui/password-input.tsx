'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Input } from './input'

type Props = Omit<React.ComponentProps<typeof Input>, 'type'>

/** Input de senha com toggle de visibilidade (o reveal nativo é escondido no CSS). */
export function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-10" />
      <button
        type="button"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
