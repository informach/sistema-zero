import type { LicencaDaBiblioteca } from '@sistemazero/molda-cenarios-core/compilar'

export function textoDasLicencas(bibliotecas: readonly LicencaDaBiblioteca[]) {
  return [
    'Bibliotecas usadas nesta revisão do cenário:',
    ...bibliotecas.map((l) => `${l.nome} (${l.id}): ${l.licenca}.`),
    '',
    'As bibliotecas restritas conservam os termos e limites da licença original. A exportação não concede direitos adicionais de redistribuição dos modelos.',
  ].join('\n')
}
