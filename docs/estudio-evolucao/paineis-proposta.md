# Investigar, Desempenho e Meus testes: a proposta (20/11/2026)

Etapa 9 do plano de 20/11, parte 2. **Aprovada pela dona em 20/11/2026**; a interface segue esta
proposta à risca. Pranchas:
https://claude.ai/artifact/LzdVbKYzQ1qzET8GVezNhZ (pranchas com fotos do Estúdio de staging, com as
abas montadas na gaveta de verdade). A base técnica é a matriz [`depuracao-matriz.md`](depuracao-matriz.md).

## Onde ficam

Três abas novas na gaveta de baixo do Estúdio, depois de Mensagens e Problemas: **Investigar**,
**Desempenho** e **Meus testes**. Valem no Estúdio Completo e no Estúdio da aula, no Kids e no adulto,
nos Blocos, na Ponte e no Pro. No celular entram na aba Mensagens; a tira rola de lado e a aba aberta
fica à vista. Cada aba só liga o que precisa quando é aberta; com a gaveta fechada, o jogo roda como
hoje.

## O que cada tipo de projeto tem

| Tipo de projeto | Investigar | Desempenho | Meus testes |
|---|---|---|---|
| Jogo 2D e Jogo 2D Avançado | Pausar, Avançar 1 quadro, Valores agora, caminho até o erro | quadros por segundo, tempo de cada quadro, sprites no jogo | no navegador, num palco escondido |
| Jogo 3D, Mundo 3D e 3D Avançado | Pausar, Avançar 1 quadro, Valores agora, caminho até o erro | quadros por segundo, tempo de cada quadro, objetos e desenhos por quadro | no navegador, num palco escondido |
| Página de HTML e CSS | Valores agora e caminho até o erro | a aba diz que a página não tem quadros para medir | no navegador: o texto da página e as mensagens |
| Python com Turtle, Pygame Zero, pygame-ce ou Raylib | Pausar e Avançar na troca de quadro, Valores agora, caminho até o erro | quadros por segundo e tempo de cada quadro | no navegador: testar o programa e testar uma função |
| Python sem biblioteca de jogo | caminho até o erro e valores quando o programa termina | o tempo que o programa levou | no navegador: testar uma função |
| Pro (JavaScript) | caminho até o erro, com arquivo e linha | quadros por segundo e tempo de cada quadro | no servidor: testar o jogo e testar uma função exportada |

Fica de fora nesta versão: parar no meio de um bloco, trocar um valor com o jogo pausado, a memória do
jogo (o navegador não informa) e Pausar ou Valores no Pro.

## Como funciona por trás (as notas das pranchas)

- **Pausar e Avançar 1 quadro** param na troca de quadro: a pausa que cada motor já tem
  (`pauseGame`/`resumeGame` do Jogo 2D, `pausado` do Avançado, `_paused` do 3D), chamada pelo Estúdio
  por mensagem; no Python, o Estúdio segura a resposta do próximo quadro. O programa da criança não muda.
- **Valores agora**: as variáveis e a posição de cada sprite, pelo leitor dos objetivos
  (`instrumentCheckScript`), que só entra no jogo com a aba aberta; no Python, o observador das missões.
  Servem para entender o jogo, nunca para nota.
- **Caminho até o erro**: o erro que o jogo já informa, com cada linha ligada ao bloco pelo mapa de blocos.
  A frase para a criança é a mesma do aviso do palco; Problemas continua contando o erro.
- **Desempenho**: liga ao abrir a aba e para ao fechar a gaveta; lê a cada meio segundo o que os motores já
  contam (`DEVTOOLS_PERF_SLICE_MS`, 500 ms; corrigido em 22/11/2026, o texto dizia "uma vez por segundo"). Cada número leva a marca medido, estimado ou indisponível. O custo da medida fica abaixo de 5% do
  quadro, conferido por teste antes de ligar.
- **Meus testes**: o formato e o julgamento dos objetivos das aulas (`SectionExecutionRule`,
  `judgeExecutionObservation`), com os mesmos limites (até 20 passos e 15 segundos por teste). Passos:
  apertar ou segurar uma tecla, esperar, clicar num sprite. Conferência: variável, posição x ou y do
  sprite, texto na tela, mensagens do jogo, com as comparações do contrato. Roda o jogo do zero num palco
  escondido, sem mexer no projeto; os testes ficam guardados no projeto. No Pro, roda no executor do
  servidor (o do Verificar projeto), com limite por pessoa, e testa também funções exportadas de `src`.

## Andamento da interface

- **Lote 1 (20/11): Desempenho no Estúdio clássico em JavaScript.** A aba na gaveta (Blocos e
  Ponte), "Medir o desempenho" e "Parar de medir", os quatro números com a marca medido ou
  indisponível, as barras dos últimos 30 segundos e quantas vezes o jogo ficou lento. Página sem
  `<canvas>` diz que não tem quadros para medir. A medida monta o jogo com a ponte
  (`preview/devtoolsBridge.ts`, baixada só ao ligar, entra como script confiável depois dos
  motores, com `runtimeInspection`); fechar a gaveta desliga. O Jogo 2D passou a contar os
  sprites desenhados entre duas "Limpar a tela" (`drawn` no inspetor `game-2d:observation`).
  O pacote de abertura do modo Blocos continua no teto de sempre: a ponte, o painel, o resumo e
  os textos do painel são baixados sob demanda.
- **Lote 2 (20/11): Investigar no Estúdio clássico em JavaScript.** "Investigar o jogo" monta o
  jogo com o leitor das variáveis (`instrumentCheckScript`, o mesmo dos objetivos; as linhas não
  mudam de número) e a ponte. Rodando: o quadro e os valores a cada meio segundo, e Pausar quando
  o motor tem a pausa (o Jogo 2D, por `SZGame2D.pauseGame`); os outros dizem que ainda não pausam
  pelo Estúdio e seguem mostrando os valores. Pausado: Continuar e Avançar 1 quadro (continua e
  pausa de novo no quadro seguinte), valores com o que mudou e "Mostrar o bloco" (a declaração da
  variável, pelo mapa do sinal vermelho). Parado com erro: o quadro, a frase do erro, o caminho
  até o erro (as linhas do script da criança na pilha, cada uma virando o bloco e o texto dele) e
  os valores daquele momento. Fechar a gaveta desliga.
- **Lote 3 (20/11): Investigar e Desempenho no Jogo 2D Avançado.** A pausa é o estado "pausado"
  do motor (a tela de pausa do próprio jogo aparece), pela porta opt-in dos inspetores
  `game-2d-advanced:investigar`, que só existe com a aba ligada. O motor passou a contar os
  quadros em que o jogo andou (o contador de passos dele anda também na pausa) e faz o Avançar 1
  quadro sozinho, pausando no começo do passo seguinte: exato também com o relógio fixo, que pode
  rodar zero ou dois passos num quadro da tela. Fora da partida (menu, fim, batalha) a aba diz
  "Dá para pausar quando a partida está rolando." A tecla de pausa do próprio jogo também aparece
  na aba. Desempenho: quantos personagens o motor desenhou no último quadro, depois do recorte da
  câmera. Custo no motor: +779 caracteres (409.632 de 415.000) e +209 em gzip (122.593 de
  124.000), com as explicações fora do texto do runtime; a dívida de parâmetros sem tipo não
  cresceu (as ações não têm parâmetro).
- **Lote 4 (20/11): Investigar e Desempenho nos três 3D.** Os tetos dos 3D não têm folga (o Jogo
  3D sem cenário mede 207.640 de 207.700) e nenhum teto sobe, então o código das abas entra numa
  VARIANTE do motor, `investigar` (`official-extensions/three3dInvestigation.ts`), que a prévia só
  pede com uma aba ligada, pela ponte (baixada sob demanda). No motor de sempre os dois marcadores
  viram nada: as oito variantes de sempre saíram byte a byte iguais (impressão digital antes e
  depois). A pausa é a de cada motor: a `_paused` no Jogo 3D e no Mundo 3D, e a aba só continua o
  que ELA pausou (a tela de Jogar e o fim de jogo das regras não são desfeitos: a aba diz "Dá para
  pausar quando a partida está rolando."); o estado "pausado" no 3D Avançado. Avançar 1 quadro
  anda um quadro do laço da partida. Desempenho: "Objetos na cena" (malhas, sprites, pontos e
  linhas ligados) e "Desenhos por quadro" (as chamadas da placa de vídeo no último quadro, somando
  todas as passadas do pós-processamento), no lugar dos sprites. O pacote de abertura do modo
  Blocos segue no teto: a ponte só usa de `#extensions` o que a prévia já usava, porque um nome
  novo exportado do pedaço principal muda os apelidos curtos do build e cresce os pedaços de
  abertura (medido: +23 bytes).
- **Lote 5 (em andamento): Meus testes no Estúdio clássico em JavaScript.** Decisões de desenho,
  dentro do contrato dos objetivos (`core/learning/project-execution.ts`):
  - **No projeto:** `studentTests` (até 20 testes; cada um `{ id, name, rule }`, com `rule` uma regra
    `behavior` válida por `isSectionExecutionRule`). Opcional e omitido sem testes: os projetos de
    hoje ficam byte a byte iguais. O esquema do documento (`core/studio/project-document.ts`) é
    estrito e o Members confere o envio por ele: o Members sai com o esquema novo ANTES de a
    interface deixar criar testes.
  - **Passos:** Apertar a tecla → `press` (80 ms); Segurar a tecla por N segundos → `press` com
    `holdMs` (até 5 s); Esperar → `wait` (até 10 s); Clicar no sprite → `clickTarget` sprite. Soma
    das esperas até 15 s.
  - **No fim, confira:** a variável → `value`; a posição x ou y do sprite → `value` com
    `<sprite>.x`/`.y` (o alvo `spritePosition` do contrato só vale no padrão parado-e-anda); o
    texto na tela → `text`; as mensagens do jogo → `console`; as doze comparações do contrato.
  - **Executor:** um quadro escondido com o documento da prévia, o leitor das variáveis e um
    piloto (tecla e clique sintéticos, como os controles da página de jogar); a observação no
    formato `ExecutionObservation`, julgada por `judgeExecutionObservation`.
  - **Feito (20/11):** o documento no projeto (`6d775ab7a`), o executor (`studentTests/`) e a aba
    na gaveta, nas duas pranchas: "Rodar os testes", "+ Novo teste", o resumo ("2 de 3 testes
    passaram."), cada teste escrito como na prancha, "Passou:"/"Não passou:", "Ver como o jogo
    terminou" (a foto do palco escondido no fim, pela ponte da capa) e "Editar"; o formulário com
    Nome, Quando eu (Apertar a tecla, Segurar a tecla por N segundos, Esperar), No fim, confira
    (a variável, a posição x ou y do sprite, o texto na tela, as mensagens do jogo, com os nomes
    que existem no projeto e as comparações que fazem sentido para cada uma), Salvar e Cancelar.
    A prévia entrega à instância a fábrica do documento (`state/previewDocumentFactory.ts`), que
    prepara como o Rodar (o rascunho do editor desce para o projeto e o projeto é gravado) e monta
    com o projeto gravado. A edição ganhou "Apagar teste" (sem ele um teste não sai mais do
    projeto). e2e `student-tests.spec.ts` no Chromium, no Firefox e no WebKit.
  - **"Clicar no sprite … do grupo …" (20/11, noite):** o clique do contrato é o do Jogo 2D
    (sprite de um grupo, pelo inspetor oficial de grupos, palco sem câmera), e a aba só o oferece
    num jogo com o Jogo 2D instalado. As quatro funções que rodam na página (o leitor do grupo, a
    medida do palco, a escolha do ponto e a conversão para a tela) passaram a ter uma fonte só,
    `studio/src/check/clickTargetInPage.ts`: o piloto as injeta no jogo e o executor do servidor as
    recebe pelo módulo gerado `click-target.generated.mjs` (o `check:validation-profile` reprova
    se o gerado não for o da fonte). e2e com o jogo final do Cadê Todo Mundo (clicar no
    esconderijo2 conta um achado) no Chromium, no Firefox e no WebKit.
  - ⚠️ **Ordem do deploy:** o Members confere o envio pelo esquema do documento; ele sai com o
    esquema novo (`6d775ab7a` ou depois) ANTES do Kids, da comunidade e do member-shell, senão um
    projeto com testes não sobe para a conta.
- **Lote 6 (20/11, noite): Desempenho no Python.** A aba aparece na gaveta do Python clássico. Com
  Turtle, Pygame Zero, pygame-ce ou Raylib: quadros por segundo e tempo de cada quadro (sem a
  contagem de sprites, como a tabela pede), medidos no quadro do Python: cada renderizador diz
  quantos quadros já pintou (`paintedFrames`), e o quadro, com a medida ligada, olha esse contador
  a cada quadro da tela e manda uma fatia a cada meio segundo (comando e mensagem `perf` no
  protocolo do quadro, conferidos pela página). Não toca no programa nem no worker, e medir não
  recomeça o programa. Programa sem tela (só print e input): o tempo que ele levou, marcado pela
  prévia no começo e no fim de cada execução. O painel não carrega nada do Python (quem decide se
  há tela é a prévia), e o painel de Meus testes passou a baixar à parte (Investigar e Desempenho
  não pagam mais pelo executor e pelo analisador do script). Provas: o leitor da mensagem, a aba no
  Python (com e sem tela) e, na suíte Python do navegador (`e2e-runtime/python-provider.spec.ts`,
  na homologação), um jogo de Pygame Zero com os quadros contados e a medida que para ao desligar.
  ⚠️ O quadro do Python vem da distribuição publicada do runtime (o endereço vem da decisão do
  servidor), e nenhum CI a publica: a medida só funciona em staging depois de uma versão nova da
  distribuição. Até lá, o quadro publicado recusa o comando e a aba diz "Ainda não dá para medir
  este programa aqui." (o tempo do programa sem tela já funciona, é da página).
- **Lote 7 (20/11, noite): Investigar no Python.** "Investigar o programa" recomeça o programa no
  modo de observação (o observador das missões, que o runtime publicado já tem: lê as variáveis a
  cada quadro sem mudar o programa). Os valores agora: as variáveis criadas no topo do arquivo,
  uma por quadro, refeitas a cada meio segundo; no programa sem tela, os valores do fim (a sonda
  só é respondida no fim, e perguntar enquanto ele roda prenderia a sonda). "Mostrar o bloco" vai
  pela linha onde a variável nasce. O caminho até o erro vem do traceback: cada passo do projeto
  com o arquivo e a linha, o texto da linha e "Mostrar o bloco" (o pedido ganhou o alvo por linha,
  que o editor de blocos do Python resolve, abrindo o outro arquivo quando precisa). Pausar e
  Avançar 1 quadro no Python ainda não: a aba diz que o Python ainda não pausa pelo Estúdio (a
  pausa precisa do quadro do Python, que chega com a próxima versão da distribuição). Provas: as
  funções puras (nomes, traceback, valores), a aba no Python (valores, linha, erro) e, na suíte
  Python do navegador (homologação), o controlador no modo de observação lendo `WIDTH` e o
  contador de quadros subindo num jogo de Pygame Zero.
- **Lote 8 (20/11, noite): Meus testes no Python.** A aba entra na gaveta do Python clássico, com
  a tabela: no programa com Turtle, Pygame Zero, pygame-ce ou Raylib, o teste novo escolhe
  "Testar o programa" ou "Testar uma função"; sem biblioteca de jogo, só "Testar uma função".
  - **Testar o programa:** os passos Apertar a tecla, Segurar a tecla e Esperar (o clique no
    sprite de um grupo é do Jogo 2D) e, no fim, a variável, a posição x ou y (`ator.x`) ou as
    mensagens do programa (a tela do Python é um desenho, sem texto para ler).
  - **Testar uma função** (a prancha do Pro, em Python): escolhe uma função `def` de um arquivo
    `.py` do projeto e escreve os casos, um por linha, como no Python (`2, 3 -> 5`,
    `"Ana" -> "Olá, Ana"`); até 8 casos. Sem função no projeto, a aba explica como criar uma, com
    o exemplo `somar_pontos`.
  - **Executor** (`studentTests/pythonRunner.ts`): uma execução escondida do Python, só do teste,
    no modo de observação das missões, com o ambiente e o projeto que a prévia entrega
    (`state/pythonTestHost.ts`; o editor descarrega o que segura antes, como no Rodar). A tecla
    vai pelo comando novo `key` do quadro do Python, que despacha o KeyboardEvent no desenho
    (+582 bytes no `frame.mjs`; as teclas do contrato vêm de `@sistemazero/core/studio/execution-keys`,
    porque o índice de `core/learning` levava +302 KB ao quadro). A função é chamada pela sonda
    `functionReturns` das missões: no quadro, ou no fim do programa sem desenho. O julgamento é o
    dos objetivos; "Ver como o programa terminou" é a foto do quadro do Python.
  - **No documento:** o teste de função (`functionReturns`, até 8 casos) e o campo `studentTests`
    no projeto Python clássico (`core/studio/student-tests.ts` e `project-document.ts`).
  - ⚠️ O teste de função já roda com o quadro publicado (a sonda das missões é de antes). O
    teste com tecla precisa do quadro novo: até uma versão nova da distribuição do runtime, o
    quadro publicado recusa a tecla e o teste diz "Este teste tem um passo que o Python ainda não
    roda aqui." (o teste só com esperas roda).
  - ⚠️ **Ordem do deploy:** o Members confere o envio pelo esquema do documento; ele sai com o
    esquema novo (o commit do core deste lote) ANTES do Kids, da comunidade e do member-shell.
  - Provas: o contrato no core, os casos (ler e escrever como no Python), o executor com um
    controlador falso (função certa, errada, ausente, erro, prazo, tecla recusada, mensagens), a
    aba na gaveta (o formulário de função, o exemplo sem função, os passos e conferências do
    Python) e, na suíte Python do navegador (homologação; o servidor de provas não roda no Windows
    com o Bun 1.3), o quadro apertando Espaço e a seta num jogo de Pygame Zero e o executor
    inteiro testando uma função do Python clássico.
- **Lote 9 (20/11, noite): Investigar e Desempenho no Pro em JavaScript.** A gaveta do Pro ganha
  as abas Investigar e Desempenho, entre Problemas e Terminal (a ordem da prancha). O Python Pro
  não entra (a tabela da proposta é do Pro em JavaScript).
  - **Investigar:** o caminho até o erro que parou o jogo, da pilha que a prévia já recebe: cada
    passo que é arquivo do projeto, com o arquivo, a linha, o texto da linha e "Ir para a linha"
    (abre o arquivo no editor); a biblioteca e o navegador ficam de fora. Sem erro, a aba diz que
    o caminho aparece quando o jogo parar com um erro. Pausar e Valores não entram no Pro.
  - **Desempenho:** a mesma aba do clássico, com os quadros por segundo e o tempo de cada quadro
    (sem sprites; a memória segue indisponível), sem montar o jogo de novo.
  - **Por trás:** a ponte que a prévia do Pro já injeta na página (`buildProHostBridgeScript`, do
    core) ganhou `sz:perf` (desligada até o Estúdio pedir; ligada, conta os quadros pelo
    `requestAnimationFrame` e devolve o do navegador ao desligar) e `sz:pro-error` (o erro com a
    pilha, no máximo 20 por página). `modes/pro/proPreviewDevtools.ts` liga as duas prévias: a do
    WebContainer (só a medida; o erro já chega pelo `preview-message`) e a montada no servidor
    (medida e erro). Fechar a gaveta desliga a medida.
  - ⚠️ A prévia montada no servidor como artefato recebe a ponte no build do studio-runtime: a
    medida e o erro com a pilha valem nela depois do próximo deploy do studio-runtime (o perfil de
    validação foi regenerado). A prévia do WebContainer (Estúdio Completo) e a de documento direto
    já valem.
  - Provas: a ponte sobre uma janela de mentira (medida ligada e desligada, página sem quadros,
    outra origem ignorada, erro com a pilha e o teto de 20), a pilha do Chromium, do Firefox e do
    Safari virando passos, e a gaveta do Pro (as abas, o caminho até o erro com "Ir para a linha",
    a medida que para ao fechar e o Python Pro sem as abas).
- **Lote 10 (20/11, noite): Meus testes no Pro em JavaScript.** A aba entra na gaveta do Pro
  (entre Desempenho e Terminal) quando o host entrega o executor do servidor; hoje, o Pro do
  Estúdio Completo (Kids e adulto). Na prancha: "Rodar os testes", "1 de 1 teste passou. Rodou no
  servidor em 6 segundos.", e o teste novo com "Testar o jogo" e "Testar uma função".
  - **Testar o jogo:** Apertar a tecla, Segurar a tecla e Esperar; no fim, o texto na tela ou as
    mensagens do jogo e, nos kits, o estado do jogo (a fase, os pontos, a meta ou a vida, pelo
    `__studioGame.inspect`). As variáveis não entram no Pro (o leitor das variáveis é do clássico).
  - **Testar uma função:** uma `export function` (ou `export const … =>`) de um arquivo da pasta
    `src`, com os casos um por linha escritos como no JavaScript (`2, 3 -> 5`, `true`, `null`);
    sem função, o texto e o exemplo `somarPontos` da prancha.
  - **Por trás:** `POST /members/studio/student-tests` (`StudioStudentTestsService`): confere o
    acesso ao Pro do Estúdio Completo (`FreeStudioAccessService`, `existing-pro`), confere cada
    teste pela régua do Pro (`isRunnableStudentTestRule(rule, 'javascript', 'pro')`) e roda no
    MESMO checador do "Verificar projeto" (`ProjectExecutionChecker`: limite por pessoa do
    executor, resultado reaproveitado para o mesmo projeto e as mesmas regras). Um lote por pedido
    (`studentTestServerBatches`: até 8 testes e 40 s de espera, os tetos do executor), porque a
    borda espera 160 s; o Estúdio manda os lotes em sequência. O gateway ganhou
    `members-studio-student-tests` (JWT de conta ativa, 2 MB, 20 por minuto, 160 s), o member-shell
    a rota `/api/studio/student-tests` (com os shims nos dois apps) e o adaptador
    `createStudentTestsServer`, que o `StudioProEditor` passa ao `StudioEditor`
    (`studentTestsServer`, guardado nas lojas da instância, sem código novo na abertura). O
    resultado vem como `remote` (passou ou não, e o que o executor viu): "Passou: o texto na tela
    tem o texto …" ou "Não passou: com (2, 3) respondeu 6; esperava 5".
  - **No documento:** o Pro em JavaScript guarda `studentTests` (`project-document.ts`).
  - ⚠️ **Ordem do deploy:** Members (esquema e rota) e gateway (a rota) antes do Kids e da
    comunidade.
  - Provas: a régua e os lotes no core, o serviço do Members (acesso, lotes, recusas, executor fora
    e o motivo da recusa), a rota no gateway, a rota do BFF e o adaptador, os casos em JavaScript,
    as funções exportadas e a gaveta do Pro (a aba só com o servidor, o formulário do jogo e o da
    função, e os resultados com o tempo do servidor).
- **Lote 11 (20/11, noite): Pausar e Avançar 1 quadro no Python.** Como a tabela pede, na troca
  de quadro e nos quatro motores que desenham (Turtle, Pygame Zero, pygame-ce e Raylib); o
  programa sem tela continua só com os valores do fim e o caminho até o erro.
  - **No quadro do Python** (`framePause.ts`): com a pausa pedida, a resposta do próximo quadro
    pintado leva `hold: true` e o resto da resposta igual. A ponte (o `present` do Pygame Zero, que
    o pygame-ce usa, o ponto de checagem da Raylib e a troca do Turtle) espera num laço de pedidos
    curtos (`{"hold":true}`) que o quadro só responde quando chega uma leitura dos valores (roda o
    ponto de checagem e pede de novo, sem andar o programa), quando a criança continua ou quando
    ela avança 1 quadro (solta e segura de novo no quadro seguinte). O programa da criança não
    muda. O Turtle só pinta quando o desenho muda (o desenho pronto, parado no `mainloop`, não
    pinta mais nada): nele a pausa vale na próxima resposta, e o quadro acorda a espera do Turtle
    para essa resposta chegar. Parar encerra o worker inteiro: uma pausa nunca deixa o executor
    preso.
  - **Os comandos** `pause` (`on`) e `step` do quadro, a mensagem `pause` (`held`, `frame`), e
    `pausePython`/`stepPython` na sessão (esperam o quadro em que o programa parou, até 2 s) e
    `pause`/`step` no controlador, só para o dono da execução.
  - **Na aba** (`runPythonInvestigation`, em `pythonInvestigation.ts`, baixado com a aba): no
    programa que desenha, a aba pergunta ao quadro com o "continuar" sem efeito; o quadro que
    conhece a pausa aceita e aparecem Pausar, Continuar e Avançar 1 quadro (o mesmo cartão do
    JavaScript, com o número do quadro). Parado, os valores são lidos uma vez a cada Avançar. A
    pausa que não segura quadro nenhum em 2 s (o programa esperando o `input()`) é desfeita e o
    programa continua.
  - ⚠️ **Fica dormente até a próxima versão da distribuição do runtime Python** (nenhum CI a
    publica): o quadro publicado hoje recusa o comando ("Comando de execução inválido."), e a aba
    segue dizendo que o Python ainda não pausa pelo Estúdio.
  - Provas: o quadro (`framePause.test.ts`: o próximo quadro pintado, a leitura que solta uma volta,
    Continuar, Avançar, os bytes, fechar, pedido de pixels, a próxima resposta do Turtle), a sessão
    (pausar, avançar, continuar e a recusa), as pontes em CPython (o Pygame Zero, a Raylib e o
    Turtle esperando e respondendo as leituras, provado por mutação no Turtle), o laço da aba
    (pausar, avançar e continuar com os valores do quadro, o quadro antigo, a pausa desfeita e o
    programa sem tela, provado por mutação) e, na suíte Python do navegador, o Pygame Zero (o
    contador para, anda com Avançar e volta com Continuar) e o Turtle parado no `mainloop`. Foi essa
    prova que achou o pedido curto barrado no worker: os transportes do Turtle, do Pygame Zero e da
    Raylib conferiam todo pedido como quadro, e agora deixam o pedido curto ir ao quadro como veio.
- Próximos: as etapas que faltam do plano (casca ligada em staging, linha de base, Pro em escala,
  persistência, motores e streaming, Pinta e Molda, homologação final).
