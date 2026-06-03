import { redirect } from 'next/navigation'

export default function PagamentosIndex() {
  redirect('/admin/pagamentos/transacoes')
}
