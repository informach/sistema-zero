# Corre Dino: limite da tela e progressão inicial

## Decisão aprovada

O primeiro contato da criança com o Corre Dino deve concentrar-se em relações concretas: há uma tela
do jogo, ela tem tamanho escolhido e a borda revela onde ela termina. A explicação de acessibilidade
por leitor de tela é valiosa, mas entra em curso posterior, quando a criança já domina a construção
inicial de um jogo.

## Limite da tela

`stage-size` continua sendo uma experiência de três descobertas: ligar a borda, mudar um tamanho e
chegar a 480 por 270. A ação que o botão oferece é sempre explícita:

- borda escondida: **Ligue a borda**;
- borda visível: **Desligue a borda**.

O palco deixa de vestir o cenário Corre Dino. A página e a tela do jogo começam com o mesmo azul-claro;
sem borda elas parecem uma única superfície. A borda revela o retângulo do jogo. O retângulo interno
é o único viewport: muda de largura e altura, recorta tudo o que pertence ao jogo e não altera a
área externa que representa a página. Não haverá seletor de cor nesta experiência, para não criar um
segundo assunto antes de a criança entender o limite.

## Ordem da Aula 1

A atual seção `tela-v7` será separada em duas, sem duplicar uma área de trabalho:

1. **Descubra o limite da tela**: pequena orientação conceitual e a experiência `stage-size`; não
   contém Estúdio nem verificação de projeto.
2. **Prepare a tela no seu projeto**: vídeo de montagem, orientação do Zappy e Estúdio; contém apenas
   os critérios do projeto para 480 × 270 e borda de espessura 4.

O bloco da experiência deixa de declarar `cenario: "corre-dino"`. Ela ensina a tela, não o cenário do
jogo.

## Leitor de tela

O motor, a cena `screen-reader`, seus testes e sua documentação geral permanecem reutilizáveis. Saem
somente os usos curriculares do Corre Dino:

- vídeos, experiência, orientação e seções da Aula 1;
- critério de descrição e bloco de descrição do projeto da Aula 1;
- instruções, referências de montagem e roteiro que apresentem essa construção como parte do curso.

Nenhuma compatibilidade de conteúdo legado é necessária: as aulas interativas ainda estão em autoria.
Depois da importação do manifesto revisado, a Aula 1 deve ser publicada novamente e suas vozes do
Zappy regeneradas.

## Critérios de aceite

- A cena começa com botão **Ligue a borda** e muda para **Desligue a borda** após o clique.
- O azul da página fica fixo; a área do jogo é o único retângulo que muda de tamanho e recorta o
  conteúdo do palco.
- A experiência do limite não usa cenário Corre Dino e não compartilha seção com Estúdio.
- O manifest, montagem e roteiro do Corre Dino não incluem a atividade ou a montagem de leitor de
  tela; a cena genérica continua disponível em código e nos testes próprios.
- O manifesto importa, os testes de cenas e a QA documental da Aula 1 passam.
