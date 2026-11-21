import { expect, test } from 'bun:test'
import { waitFor } from '@testing-library/react'

// happy-dom <=20.11.1 loses its delivery callback after GC even while both
// observer and target remain alive (upstream #2264, fixed in 20.11.2).
test('o observador continua entregando alterações depois da coleta de memória', async () => {
  const target = document.createElement('div')
  document.body.append(target)
  let deliveries = 0
  const observer = new MutationObserver(() => {
    deliveries++
  })
  observer.observe(target, { attributes: true })
  try {
    // WeakRef keeps a newly created callback alive until the current job ends.
    await new Promise((resolve) => setTimeout(resolve, 0))
    Bun.gc(true)
    target.setAttribute('data-ready', 'yes')
    await waitFor(() => expect(deliveries).toBe(1))
  } finally {
    observer.disconnect()
    target.remove()
  }
})
