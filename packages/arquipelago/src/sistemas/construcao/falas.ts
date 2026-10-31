import type { Aviso, Recusa, Resultado } from './obra'

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
    case 'quadro-do-quarto':
      return `Nessa parede tem um quadro do seu quarto. Ponha a ${r.abertura} mais para o lado.`
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
    case 'tem-movel':
      return 'Ali já tem um móvel. Escolha outro lugar ou apague ele primeiro.'
    case 'movel-fora-de-comodo':
      return 'O móvel vai dentro de um cômodo novo, inteiro no mesmo cômodo.'
    case 'movel-no-quarto':
      return 'O quarto é o da plataforma. Ponha o móvel num cômodo novo.'
    case 'sem-parede-atras':
      return 'Quadro, espelho, prateleira e toalheiro vão numa parede. Toque perto de uma.'
    case 'movel-na-parede':
      return 'Nessa parede tem uma peça pendurada. Apague a peça primeiro.'
    case 'canteiro-com-planta':
      return 'Esse canteiro tem planta. Colha primeiro e depois apague.'
    case 'entrada-fora':
      return 'A entrada vai numa parede que dá para fora.'
    case 'varanda-nao-cabe':
      return 'A varanda não cabe aí. Escolha outra parede de fora.'
    case 'entrada':
      return 'A casa precisa de uma porta de entrada. Toque nela com a Porta para mudar de lugar.'
    case 'nada':
      return null
  }
}

/** O que o Zappy diz quando a mudança deu certo de um jeito que merece aviso. */
export function falaDoAviso(a: Aviso): string {
  switch (a) {
    case 'janela-virou-porta':
      return 'A janela virou porta.'
  }
}

/**
 * A linha de baixo do Construir enquanto o dedo ou o mouse passa por cima: o motivo de não dar (a
 * mesma fala do Zappy no toque), ou `null` quando dá ou não há nada ali (volta a dica da ferramenta).
 * Fora de uma parede (`sem-parede`, o mouse passando pela grama com a Porta ou a Janela) a dica
 * normal fica: trocar a linha a cada célula de grama só piscaria um aviso que ela já sabe.
 */
export function motivoDaPrevia(r: Resultado | null): string | null {
  if (!r || r.ok || r.motivo === 'sem-parede') return null
  return falaDaRecusa(r)
}
