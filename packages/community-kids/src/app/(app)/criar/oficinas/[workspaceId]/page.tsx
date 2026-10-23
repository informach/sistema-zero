import { LiveContinuedCreation } from '@sistemazero/member-shell/components/live/live-continued-creation'
export default async function ContinuedWorkshopProject({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  return <LiveContinuedCreation workspaceId={(await params).workspaceId} />
}
