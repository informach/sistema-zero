# Cena ampla no palpite — design

## Objetivo

Deixar a criança enxergar a mesma cena em tamanho amplo antes e depois de responder o palpite, e remover o elemento visual que parece uma alternativa extra do quiz.

## Problema observado

O cartão “Hoje vamos usar” repete a informação que o balão do Zappy já apresenta no contexto. Como ele tem a mesma caixa visual das alternativas, parece uma opção clicável.

O palco e sua prévia também são restringidos por `max-w-scene`. Em uma atividade cujo card já tem largura suficiente, isso reduz a cena e a separa visualmente da conversa e dos controles.

## Alternativas consideradas

1. Manter o cartão e apenas trocar suas cores. Isso continua repetindo a mensagem e ainda cria um quarto item entre as escolhas.
2. Usar `100vh` para a cena. Ela ficaria grande, mas empurraria instruções e controles para fora da visão, especialmente em tablets e celulares.
3. Usar toda a largura útil do card, preservando a proporção de cada palco. Esta é a alternativa aprovada: amplia a experiência sem separá-la de seu contexto.

## Decisão

- Remover o cartão visual “Hoje vamos usar”. O contexto do palpite continua apresentando o recurso à criança, inclusive para a voz do Zappy e tecnologias assistivas.
- Remover o teto `max-w-scene` das molduras do palco aberto e da prévia do palpite.
- Manter `w-full`, `overflow-hidden`, borda e cantos; cada palco continua dono de sua proporção e altura natural.
- Não usar altura fixa de viewport, escalonamento artificial ou controles na prévia.

## Jornada esperada

1. A criança chega ao palpite, ouve/lê o contexto e vê uma prévia ampla, estática e segura.
2. Ela reconhece que somente os botões seguintes são escolhas.
3. Ao escolher, a prévia dá lugar à cena aberta na mesma largura útil; instrução e controles aparecem no fluxo logo abaixo.

## Verificação

- O card “Hoje vamos usar” não é renderizado.
- Prévia e palco aberto não possuem `max-w-scene` nem centralização que limite sua largura.
- A prévia conserva `role="img"`, rótulo acessível e a ocultação de controles.
- Os testes de estrutura da cena confirmam os dois estados amplos.
