import { useEffect, useRef, useState } from 'react'

export function useDebounced<T>(value: T, delay: number, flushVersion: string | number = 0): T {
  const [debounced, setDebounced] = useState({ value, flushVersion })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (debounced.flushVersion !== flushVersion) {
      setDebounced({ value, flushVersion })
      return
    }
    timer.current = setTimeout(
      () =>
        setDebounced((previous) =>
          Object.is(previous.value, value) && previous.flushVersion === flushVersion
            ? previous
            : { value, flushVersion },
        ),
      delay,
    )
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value, delay, flushVersion, debounced.flushVersion])
  // Explicit snapshot boundaries must use the latest value in this render, before effects.
  return debounced.flushVersion === flushVersion ? debounced.value : value
}
