/**
 * A linha "o que se faz" de cada quadro do Quadro das Cores (retorno de quem testou, 01/11/2026).
 * Uma frase curta (até `LIMITES_DO_DESAFIO.resumo`), tirada do pedido do morador, que o cartão do
 * Quadro mostra embaixo do título. A chave é o slug sem o sufixo `-adulto`: Kids e adulto usam a
 * mesma linha. Sem entrada aqui, o jogo mostra a primeira frase do enunciado.
 */
export const RESUMOS_DOS_QUADROS: Readonly<Record<string, string>> = {
  // Sua ilha (o Nico)
  'sua-ilha-passos-na-areia': 'Faça o guia andar com as setas, sem sair da tela.',
  'sua-ilha-a-primeira-concha': 'Faça o guia pegar a concha ao encostar nela.',
  'sua-ilha-o-balde-do-nico': 'Entregue a concha no balde do Nico.',
  'sua-ilha-a-concha-rosa': 'Faça o balde aceitar só a concha rosa.',
  'sua-ilha-a-mare-volta': 'Faça o Enter deixar a praia como era no começo.',
  'sua-ilha-pega-conchas': 'Encha o balde com as três conchas da praia.',
  // Bosque (a Capi)
  'bosque-chuva-de-pinhas': 'Faça pinhas caírem em cima do coelho.',
  'bosque-bolotas-para-o-alto': 'Faça o espaço jogar uma bolota para cima.',
  'bosque-quebrar-as-pinhas': 'Bolota e pinha somem juntas e valem um ponto.',
  'bosque-tres-vidas': 'Dê três vidas ao coelho e tire uma a cada pinha.',
  'bosque-fim-e-outra-partida': 'Acabe a partida sem vidas e recomece com Enter.',
  'bosque-corrida-dos-bichos': 'Faça os quatro bichos correrem até um ganhar.',
  // Vila Doce (o Bento)
  'vila-doce-corrida-do-entregador-pulo': 'Faça o entregador cair no chão e pular.',
  'vila-doce-corrida-do-entregador-pedras': 'Faça pedras entrarem pela direita da tela.',
  'vila-doce-corrida-do-entregador-partida': 'Comece e recomece a corrida com uma tecla.',
  'vila-doce-corrida-do-entregador-batida': 'Encostar numa pedra encerra a corrida.',
  'vila-doce-corrida-do-entregador-sorteio': 'Sorteie o lugar e o tamanho de cada pedra.',
  'vila-doce-corrida-do-entregador': 'Faça as chaminés virem cada vez mais rápidas.',
  // Recife Coral (a Maré)
  'recife-uma-bolha-por-vez': 'Faça o espaço soltar uma bolha por vez.',
  'recife-alvo-preso': 'A bolha que prende a estrela vale um ponto.',
  'recife-alvo-em-outro-lugar': 'Faça a estrela presa voltar em outro lugar.',
  'recife-tempo-de-partida': 'Faça o relógio acabar a partida no zero.',
  'recife-nova-partida': 'Faça o Enter começar uma partida nova.',
  'recife-mira-de-bolhas-python': 'Leve cada muda clicada até o coral dela.',
  // Pico Gelado (o Floco)
  'pico-pulo-com-apoio': 'Faça o pinguim pular só quando está no gelo.',
  'pico-agua-volta-ao-comeco': 'Cair na água leva o pinguim de volta ao começo.',
  'pico-proxima-fase': 'A bandeira leva o pinguim à fase 2.',
  'pico-fim-do-jogo': 'Chegar à bandeira da fase 2 termina o jogo.',
  'pico-de-volta-a-fase-1': 'Faça o Enter levar tudo de volta à fase 1.',
  'pico-fase-de-plataforma-python': 'Suba o Pico pegando os flocos de cada trecho.',
  // Vale dos Dinos (a Jade)
  'vale-onda-de-cinza': 'Faça o espaço começar uma onda de cada vez.',
  'vale-relogio-da-onda': 'Solte uma cinza por segundo até a onda acabar.',
  'vale-ninho-atingido': 'Conte cada cinza que chega ao ninho.',
  'vale-alcance-da-torre': 'Faça a torre limpar a cinza no alcance dela.',
  'vale-ondas-que-crescem': 'Cada onda traz uma cinza a mais.',
  'vale-guardiao-dos-ninhos-texto': 'A torre escolhe a cinza mais adiantada.',
  // Ilha das Nuvens (a Iriê)
  'nuvens-plantar-com-moedas': 'Plante pagando duas moedas por canteiro.',
  'nuvens-canteiro-ocupado': 'Canteiro ocupado recusa outra planta.',
  'nuvens-producao': 'Cada canteiro plantado rende uma moeda por segundo.',
  'nuvens-colher-os-canteiros': 'Colha todos os canteiros de uma vez.',
  'nuvens-meta-do-jardim': 'Marque a meta quando chegar a vinte moedas.',
  'nuvens-jardim-em-grade-pro': 'Planta com vizinha rende uma moeda a mais.',
  // Farol (a Íris)
  'farol-meu-jogo-do-arquipelago': 'Invente o seu jogo com os desenhos do palco.',
  'farol-meu-jogo-do-arquipelago-ponte': 'Invente o seu jogo em JavaScript na Ponte.',
  'farol-meu-jogo-do-arquipelago-pro': 'Invente o seu jogo como projeto no Pro.',
  'farol-meu-jogo-do-arquipelago-python': 'Invente o seu jogo em Python.',
}
