import { type ReactNode, useLayoutEffect, useRef } from 'react'

/** Keep a native stage menu inside the drawing area, including a resized animation timeline. */
export function SceneStageDropdown({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    const stage = element?.closest('.mld-stage-viewport')
    const details = element?.closest('details')
    if (!element || !stage || !details) return
    const fit = () => {
      if (!details.open) return
      const available =
        stage.getBoundingClientRect().bottom - element.getBoundingClientRect().top - 8
      element.style.maxHeight = `${Math.max(0, available)}px`
    }
    const observer = new ResizeObserver(fit)
    observer.observe(stage)
    if (details.parentElement) observer.observe(details.parentElement)
    details.addEventListener('toggle', fit)
    fit()
    return () => {
      observer.disconnect()
      details.removeEventListener('toggle', fit)
    }
  }, [])
  return (
    <div ref={ref} className={`${className} mld-scroll-y`}>
      {children}
    </div>
  )
}
