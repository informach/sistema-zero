# O Zappy e as abas Investigar e Desempenho (lote 5, 21/11/2026)

Seção 15 da missão: o Zappy deve ajudar a "interpretar valores de variáveis", "explicar a
execução" e "identificar gargalos de desempenho", com explicações "fundamentadas no estado real
do projeto" e sem "inventar arquivos, linhas, erros ou métricas". A assistência "não deve ser
ativada a cada tecla nem competir com a renderização e a execução do jogo".

## Como funciona

- **Sob demanda.** O Zappy só recebe o que uma aba mostra quando a criança LIGOU a aba (Investigar
  ou Desempenho) e fez uma pergunta. Nada é observado sozinho: no momento da pergunta, o painel do
  Zappy lê a janela da aba (`components/devtools/zappyObservation.ts`, `readZappyObservation`),
  baixada só nesse caso (o pacote do Zappy não leva o módulo das abas). Se esse pedaço não baixar
  (deploy novo, rede instável), a pergunta segue sem a observação.
- **Só o que a aba está mostrando** (as mesmas condições de tela do `InvestigatePanel` e do
  `PerformancePanel`, conferidas com a execução de agora, lida do `proRun`):
  - Investigar: com o jogo rodando (no Python, também esperando a entrada ou terminado), o quadro,
    se está pausado e até 20 valores (nome com até 60 caracteres e valor com até 160). Parado com
    erro de execução, só os valores daquele momento. Depois de Parar, nada: a aba diz "não está
    rodando". No Python a janela é limpa a cada execução (`useFreshInvestigationPerRun`), então
    o erro de uma execução não gruda nas seguintes.
  - Desempenho: os mesmos números dos cartões (quadros por segundo agora e o menor, quantas vezes
    ficou lento, o quadro mais demorado e quantos sprites, objetos ou desenhos), sem número
    inventado: conta que o motor não mede vai como nula. Página sem `<canvas>` e programa Python
    sem tela não mandam quadros por segundo (a aba mostra outra coisa nesses casos).
  - Também vai quais abas estão ligadas (`observing`): aba ligada sem leitura não vira "ligue a
    aba", e sim "rode o jogo e pergunte de novo".
- **Tetos.** O Estúdio corta cada número e cada valor nos tetos do esquema do servidor; no
  servidor, uma observação fora deles é DESCARTADA (`.catch`), nunca recusa a pergunta. No pedido
  ao modelo a observação tem teto de 3.000 caracteres (`ZAPPY_OBSERVATION_MAX_CHARS`). Quando o
  pedido inteiro não cabe no orçamento, os trechos de código encolhem até 600 caracteres e depois a
  observação sai inteira, antes da conversa, do conhecimento e dos arquivos de código; no Python,
  também antes de a pergunta ser recusada (`observationCanYield`). Os valores do erro iguais aos de
  agora vão uma vez só.
- **Limpeza.** Os valores podem ser texto que a criança digitou no jogo: passam pela mesma limpeza
  de segredos do erro, no Estúdio (`redactStudioTutorSecrets`) e de novo no servidor
  (`redactZappySensitiveText`), que limpa também o nome. `oQueOJogoMostra` e `desempenhoMedido`
  estão na lista de dados não confiáveis das regras dos três modos.
- **Rodando sem variáveis.** Com o jogo rodando e a aba pronta, a lista de valores vai vazia, e a
  regra diz que é um jogo rodando sem variáveis para mostrar (antes o modelo lia "aba ligada sem
  leitura" e mandava rodar de novo).
- **No servidor** (`member-shell`): `server/zappy-observation.ts` põe no pedido ao modelo
  `oQueOJogoMostra`, `desempenhoMedido` e `abasLigadas`, nos blocos, no Pro em JavaScript e no
  Python (clássico e Pro), com a regra do modo (`zappyObservationRule`): usar esses valores para
  explicar a execução, apontar UMA causa provável de lentidão sustentada pelos números e nunca
  inventar valores ou medidas. No Pro, a única aba ligada a estes campos é a Desempenho (a
  "Investigar" do Pro é outro painel), e a regra não sugere a Investigar.
- O cliente e o servidor saem no mesmo build de cada app (o `member-shell` é parte do app), então
  não há janela com um lado novo e o outro velho.

## Revisão do lote 5 (21/11/2026)

A revisão achou e o lote corrigiu: no Pro em JavaScript o contexto era remontado campo a campo e a
medida do Desempenho nunca chegava ao modelo (a regra mandava ligar a aba já ligada); números de
programa sem tela e de página sem canvas; valores guardados depois de Parar e o erro antigo preso
no Python; o pedaço da observação que, sem baixar, travava a pergunta; um valor fora dos tetos que
recusava a pergunta inteira; a observação sem teto no pedido; a regra incoerente com a aba ligada e
sem leitura.

## Full review final (21/11/2026)

- A observação não cedia no orçamento do pedido (o texto acima dizia que cedia); no Python, ligar a
  aba podia fazer a mesma pergunta ser recusada.
- A fase do jogo era lida antes de baixar o módulo da observação: um Parar durante o download
  mandava os valores do jogo parado como "agora". Agora é lida depois.
- O nome do valor não passava pela limpeza de segredos, e os campos das abas não estavam na lista
  de dados não confiáveis.
- O jogo rodando sem variáveis de topo virava "aba ligada sem leitura".
- No Pro, o erro de uma página anterior (o jogo já consertado e recarregado) ainda ia ao Zappy e
  aparecia no Investigar, embora já não contasse na aba Problemas (`isCurrentPageError` no
  `logsStore`, a mesma régua nos três).
- Fica como está: a observação é do jogo que roda, e o código vai como está no editor; com a prévia
  defasada (código editado depois de rodar) o modelo não é avisado.

## Testes

- `studio/src/studio/tutor.test.ts`: sem as abas nada vai; teto de 20 valores, cortes e segredos
  limpos; desempenho arredondado e contas ausentes nulas; cada número cortado nos tetos do
  servidor e valor sem nome fora.
- `studio/src/components/devtools/zappyObservation.test.ts`: as condições de tela de cada aba
  (depois de Parar, parado com erro, erro antigo com o jogo rodando de novo, Python esperando ou
  terminado, página sem canvas, Python sem tela, medida recusada ou vazia).
- `studio/src/components/devtools/useFreshInvestigationPerRun.test.tsx`: a janela recomeça a cada
  execução nova do Python (vermelho com o hook sabotado).
- `member-shell/tests/zappy-observation.test.ts`: valores repetidos uma vez só, o teto cedendo
  primeiro os valores do erro, as abas ligadas e a regra do Pro.
- `member-shell/tests/studio-zappy.test.ts` ("seção 15"): pela borda HTTP, os campos chegam ao
  pedido do modelo nos blocos e no Pro em JavaScript, e a observação fora dos tetos não recusa a
  pergunta (os dois casos novos reprovam com os consertos sabotados).
- `member-shell/tests/studio-zappy-python.test.ts` ("lote 5"): o mesmo no Python clássico e Pro.

## O que fica

- O Zappy não pede sozinho para ligar uma aba nem lê o jogo continuamente: é de propósito (seção 15).
- "Sugerir testes" e "orientar refatorações" com o estado real seguem pelo contexto de código que o
  Zappy já recebe; não há painel novo para eles.
