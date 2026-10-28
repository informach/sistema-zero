import type { Recusa } from './obra'

/** O que o Zappy diz quando a obra não dá (sem ponto de exclamação, sem pergunta). */
export function falaDaRecusa(r: Recusa): string | null {
  switch (r.motivo) {
    case 'fora-do-lote':
      return 'Ali já é fora do terreno.'
    case 'ocupado':
      return `Ali já tem ${r.nome}. Escolha outro lugar.`
    case 'dentro-do-quarto':
      return 'Dentro do quarto não vai parede.'
    case 'fecha-ocupado':
      return `Assim ${r.nome} ficaria dentro de casa. Tente fechar o cômodo de outro jeito.`
    case 'parede-do-quarto':
      return 'As paredes do quarto ficam. Nelas dá para pôr porta e janela.'
    case 'sem-parede':
      return 'Porta e janela vão numa parede. Faça a parede primeiro.'
    case 'parede-fixa':
      return 'Essa parede é do quarto da plataforma. Use a da frente ou a do lado.'
    case 'encontro-de-paredes':
      return 'Ali chega outra parede. Tente um pouco para o lado.'
    case 'ja-tem-abertura':
      return 'Ali já tem porta ou janela.'
    case 'fora-de-comodo':
      return 'O piso vai dentro de um cômodo fechado por paredes.'
    case 'no-quarto':
      return 'O piso do quarto é o da plataforma. Ele muda no Meu quarto.'
    case 'limite':
      return 'A obra chegou no tamanho máximo.'
    case 'dentro-de-casa':
      return 'Isso é do quintal. Faça do lado de fora da casa.'
    case 'tem-parede':
      return 'Ali já tem parede ou cerca. Escolha outro lugar.'
    case 'tem-caminho':
      return 'Ali já tem caminho. Apague o caminho primeiro.'
    case 'sem-projeto':
      return 'Esse objeto ainda não chegou. Ele vem dos pedidos e dos desafios.'
    case 'tem-objeto':
      return 'Ali já tem um objeto. Escolha outro lugar ou tire ele primeiro.'
    case 'objeto-fora-de-comodo':
      return 'Esse objeto vai dentro de um cômodo novo, inteiro no mesmo cômodo.'
    case 'objeto-no-quarto':
      return 'O quarto é o da plataforma. Ponha o objeto num cômodo novo.'
    case 'canteiro-com-planta':
      return 'Esse canteiro tem planta. Colha primeiro e depois apague.'
    case 'nada':
      return null
  }
}
