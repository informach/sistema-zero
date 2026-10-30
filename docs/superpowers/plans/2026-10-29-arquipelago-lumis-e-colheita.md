# Lumis com diferenças reais e colheita sem perda

Parte de L08 do programa integral. Implementação no intérprete único dos contratos, consumido
pelo mundo e pela prévia do mini estúdio. Não criar outro executor nem modificar a rotina salva.

## Decisões

- Perfis de espécie nos contratos: voo, capacidade por viagem, duração do trabalho e intensidade
  de luz noturna. O jogo apresenta os números no álbum e no editor. Todas as espécies continuam
  capazes de cumprir as mesmas ações; raridade não significa superioridade em tudo.
- Ritmos entre 2 e 3 metros por segundo, trabalho entre 0,9 e 1,2 segundo, carga entre 8 e 24
  alimentos. Sem gasto de energia ou perda por ausência. São escolhas de balanceamento, não
  medidas da proposta. O bônus luminoso é desenho, nunca requisito para enxergar um caminho.
- Colheita inteira: se carga ou mochila não comportarem a colheita, o canteiro permanece maduro.
  O registro explica o próximo passo. Nunca cortar a colheita para caber nem atribuir à carga
  alimentos que já estavam na mochila. A semente devolvida também precisa caber.
- Guardar transfere somente a carga realmente colhida. Se a geladeira encher, o restante fica
  na mochila, como já acontece. Cancelar ou fechar nunca remove alimento.
- A prévia usa as mesmas regras. Seu passo didático continua manual ou a cada 700 ms, identificado
  como prévia, e não simula o tempo físico do voo. A execução no mundo usa o ritmo da espécie.
- Sem mudança de salvamento: características são catálogo, carga é transitória. O formato V17
  em desenvolvimento continua apenas com o acréscimo da amizade.

## Verificação

- [x] Perfis completos para os 14 Lumis e números limitados.
- [x] Carga, mochila cheia, semente cheia, geladeira cheia, cancelamento e execução repetida.
- [x] Mesmos resultados no intérprete passo a passo; prévia e jogo conferidos com Pluma e Búzio.
- [x] Mundo e interface usam o catálogo compartilhado, sem cópia de regras.
- [ ] Navegador com dois perfis e pausa; testes, tipagem e revisão integrada.

Navegador concluído em `docs/qa/2026-10-29-lumis-trabalho/README.md`. A linha final continua
aberta até terminar a revisão e a tipagem da composição. Cozinhar também ganhou recusa antes
de consumir ingredientes se o prato inteiro não couber, com regressão para as sete receitas.

Receitas, colheita especial e outras coleções permanecem no escopo de L08. Este plano não
declara o lote completo nem autoriza push intermediário.

## Colheita especial e humor

Continuação autorizada do lote. A colheita especial será uma unidade adicional do alimento já
existente, anunciada no resultado. Não exige modelo novo nem acrescenta um identificador por
canteiro ao salvamento. Sol favorece tomate, nublado favorece alface e chuva favorece milho.
O clima só conta depois que as Nuvens estão abertas. Humor ótimo soma mais uma unidade;
humor baixo nunca reduz a colheita normal. Os números são escolhas de equilíbrio desta entrega.

O contexto é o do instante da colheita, explicitado na prévia. Não haverá sorteio a cada quadro,
consulta ao relógio escondida nem perda por demorar para voltar. O mesmo canteiro só pode ser
colhido uma vez. Se a quantidade inteira não couber na mochila ou na carga, ele permanece maduro.

- Centralizar humor e bônus em funções puras dos contratos; mão, Lumi e prévia usam a mesma regra.
- Acrescentar clima habilitado e necessidades ao mundo transitório da rotina. Versionar o molde
  da ferramenta para V2, conservar a leitura de V1 com o comportamento sem bônus e devolver a
  versão correspondente ao pedido. Não alterar salvamentos históricos nem a rotina salva.
- A prévia mostra o contexto congelado da abertura. O mundo real relê clima e necessidades na
  aplicação do passo. Mudanças posteriores podem alterar o bônus, nunca o alimento básico.
- Provar os três climas, limiar do humor, canteiro vazio/imaturo, repetição, limites exatos de
  carga e mochila, migração do molde e paridade entre colher à mão e pelo intérprete.
- Conferir as duas interfaces e os dois públicos antes de fechar o lote.

Outra opção seria guardar uma mutação climática por canteiro. Foi descartada nesta entrega por
exigir versão adicional de salvamento e arte específica sem benefício para o ciclo de aprender,
cuidar e colher. Só acelerar o crescimento, como antes, não entrega a colheita especial pedida.

## Receitas vindas dos moradores e de coleção

- Um único catálogo declara a origem de cada receita: começo, amizade com morador, coleção ou
  festa. Diário, álbum, bancada e forno consultam a mesma regra sobre o salvamento. As sete
  receitas existentes conservam ingredientes, efeitos e limiares do Bento.
- Novas receitas com um coração: Maré ensina moqueca de legumes; Jade, açaí na tigela; Floco,
  mingau de milho; Iriê, canjica. São escolhas editoriais para concretizar os exemplos da proposta.
  Encontrar os quatro bichos libera a salada colorida. Nenhum livro de receitas separado no save.
- Ingredientes próprios de açaí e moqueca são itens de mochila, como os ingredientes atuais do
  Bento, representados no inventário por nome e ícone. Não colocar modelo inexistente no mundo.
  Os pedidos diários desses moradores entregam os ingredientes externos à horta da receita já
  aprendida. A interface informa a fonte; nada depende de pagamento ou assinatura adicional.
- Entregar o pedido e receber a cesta é uma operação pura única. Se a cesta inteira não couber,
  recusar antes de gastar os ingredientes do pedido e não marcar como entregue. A repetição do
  mesmo pedido não dá outra cesta. A receita desbloqueada nunca some por faltar.
- A pipoca da Junina permanece sazonal, e nenhuma data pendente é ativada. Só o lugar certo
  permite cozinhar. O botão relê a origem da receita e as condições atuais antes de consumir.
- Testes: origens e pistas, limiares, coleção incompleta/completa, pratos e ingredientes, recusa
  sem perda, cesta diária idempotente, UI do livro e da bancada. Recalcular o pior caso do save
  com os itens do catálogo. Não alegar prato preparado no navegador antes da prova real.
