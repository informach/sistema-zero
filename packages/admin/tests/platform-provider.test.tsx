import { describe, expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { PlatformProvider, usePlatform } from '../src/components/admin/platform-provider'
import { setPlatform } from '../src/components/admin/platform-store'

function PlatformProbe() {
  const platform = usePlatform()
  return <span data-platform={platform}>{platform}</span>
}

describe('PlatformProvider — isolamento do snapshot SSR', () => {
  test('cada árvore servidor usa o valor da própria requisição, não o singleton do processo', () => {
    setPlatform('adult')

    const kidsHtml = renderToString(
      <PlatformProvider initialPlatform="kids">
        <PlatformProbe />
      </PlatformProvider>,
    )
    const adultHtml = renderToString(
      <PlatformProvider initialPlatform="adult">
        <PlatformProbe />
      </PlatformProvider>,
    )

    expect(kidsHtml).toContain('data-platform="kids">kids')
    expect(adultHtml).toContain('data-platform="adult">adult')
  })
})
