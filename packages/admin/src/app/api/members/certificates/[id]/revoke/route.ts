import { forwardUpstream } from '@/server/forward'
import { revokeCertificate } from '@/server/members'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await revokeCertificate(id)
  return forwardUpstream({ status, body })
}
