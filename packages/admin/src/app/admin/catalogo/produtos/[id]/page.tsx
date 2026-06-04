import { ProductFormClient } from '../product-form-client'

export const dynamic = 'force-dynamic'

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductFormClient productId={id} />
}
