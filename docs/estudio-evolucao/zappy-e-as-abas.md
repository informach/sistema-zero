# O Zappy e as abas Investigar e Desempenho (lote 5, 21/11/2026)

Seção 15 da missão: o Zappy deve ajudar a "interpretar valores de variáveis", "explicar a
execução" e "identificar gargalos de desempenho", com explicações "fundamentadas no estado real
do projeto" e sem "inventar arquivos, linhas, erros ou métricas". A assistência "não deve ser
ativada a cada tecla nem competir com a renderização e a execução do jogo".

## Como funciona

- **Sob demanda.** O Zappy só recebe o que uma aba mostra quando a criança LIGOU a aba (Investigar
  ou Desempenho) e fez uma pergunta. Nada é observado sozinho: no momento da pergunta, o painel do
  Zappy lê a janela da aba (`components/devtools/zappyObservation.ts`, `readZappyObservation`),
  baixada só nesse caso (o pacote do Zappy não leva o módulo das abas).
- **O que vai.** Do Investigar: o quadro, se está pausado, até 20 valores (nome com até 60
  caracteres e valor com até 160, como a aba mostra) e, se o jogo parou com erro, os valores
  daquele momento. Do Desempenho: os mesmos números dos cartões (quadros por segundo agora e o
  menor, quantas vezes ficou lento, o quadro mais demorado e quantos sprites, objetos ou desenhos),
  sem número inventado: conta que o motor não mede vai como nula.
- **Limpeza.** Os valores podem ser texto que a criança digitou no jogo: passam pela mesma limpeza
  de segredos do erro, no Estúdio (`redactStudioTutorSecrets`) e de novo no servidor
  (`redactZappySensitiveText`).
- **No servidor** (`member-shell`): o esquema do pedido declara os dois campos com tetos
  (`routes/studio-zappy.ts`; `z.object` descarta campo desconhecido em silêncio), e
  `server/zappy-observation.ts` os põe no pedido ao modelo como `oQueOJogoMostra` e
  `desempenhoMedido`, nos três modos (blocos, Pro e Python), com a regra: usar esses valores para
  explicar a execução, apontar UMA causa provável de lentidão sustentada pelos números, e nunca
  inventar valores ou medidas; sem eles, pedir para ligar a aba e rodar o jogo.
- O cliente e o servidor saem no mesmo build de cada app (o `member-shell` é parte do app), então
  não há janela com um lado novo e o outro velho.

## Testes

- `studio/src/studio/tutor.test.ts`: sem as abas nada vai; teto de 20 valores, cortes e segredos
  limpos; desempenho arredondado e contas ausentes nulas.
- `studio/src/components/devtools/zappyObservation.test.ts`: abas desligadas não mandam nada mesmo
  com dados guardados; cada aba ligada manda o que mostra; medida recusada ou vazia não vira número.
- `member-shell/tests/studio-zappy.test.ts` ("seção 15"): pela borda HTTP de verdade, os dois
  campos chegam ao pedido do modelo com a regra nas instruções, e um e-mail digitado no jogo não
  chega (vermelho na versão anterior: o esquema descartava os campos).

## O que fica

- O Zappy não pede sozinho para ligar uma aba nem lê o jogo continuamente: é de propósito (seção 15).
- "Sugerir testes" e "orientar refatorações" com o estado real seguem pelo contexto de código que o
  Zappy já recebe; não há painel novo para eles.
