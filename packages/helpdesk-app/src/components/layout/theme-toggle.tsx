'use client'

import { Button } from '@sistemazero/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Alternar tema"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {mounted && !isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
