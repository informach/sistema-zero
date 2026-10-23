import { DesktopConnections } from './desktop-connections'
export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams
  return (
    <DesktopConnections
      initialCode={typeof params.code === 'string' ? params.code.slice(0, 20) : ''}
    />
  )
}
