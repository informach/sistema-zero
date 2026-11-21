# Isolamento da prévia do Clássico (pacote B)

Estado em 17/11/2026. Tudo abaixo foi medido neste ambiente: Chromium 153 sem interface, Linux.
**Firefox, Safari (WebKit), Android e iPad não foram medidos** (os navegadores não estão
instalados aqui e não há aparelho). Onde o texto diz "isolado", leia "isolado no Chromium de mesa".

Este é o registro da sessão inicial. A continuação no Windows mediu os três engines de
laboratório, distinguiu Chromium completo de headless shell e encontrou uma falha de reinício
também na referência original. Resultados novos: [`diagnostico-windows.md`](diagnostico-windows.md).
Nenhuma das duas sessões homologa aparelhos móveis físicos.

## B0: a medição que mudou o desenho

`packages/studio/scripts/measure-preview-isolation.mjs` usa páginas mínimas com o mesmo arranjo de
iframes do Estúdio. O filho ocupa a thread por 5 s com trabalho síncrono que não é laço (ordenar um
vetor grande dentro de chamadas nativas). A página de fora mede o maior atraso de um relógio de
50 ms e quanto demora um clique de verdade para ser atendido.

```bash
cd packages/studio && SZ_CHECK_CHROMIUM=/opt/pw-browsers/chromium node scripts/measure-preview-isolation.mjs
```

| Arranjo | Cabeçalhos do host (COOP + COEP) | Maior atraso do relógio | Clique atendido em | Isolado |
|---|---|---|---|---|
| iframe da mesma origem (controle) | não | 5006 ms | 4528 ms | não |
| `srcdoc` com sandbox (**o de hoje**) | não | 51 ms | 28 ms | **sim** |
| outro site com `srcdoc` interno (a "casca") | não | 51 ms | 29 ms | sim |
| iframe da mesma origem (controle) | sim | 5030 ms | 4541 ms | não |
| `srcdoc` com sandbox (**o de hoje**) | sim | 50 ms | 27 ms | **sim** |
| outro site com `srcdoc` interno (a "casca") | sim | 54 ms | 35 ms | sim |

**Leitura:** no Chromium de mesa, o iframe `srcdoc` com sandbox e sem `allow-same-origin` já roda
em outro processo. O comentário antigo do `PreviewIframe` ("compartilha a thread principal do
host") não vale mais ali. A casca em outra origem (B2) **não acrescenta isolamento no Chromium de
mesa**; o valor dela, se houver, está nos navegadores que ainda não foram medidos.

## B3: programas hostis no Estúdio de verdade

`packages/studio/e2e/preview-hostile-programs.spec.ts`, quatro programas colados na Ponte:
trabalho síncrono de 30 s que não é laço, recursão sem fim, enxurrada de mensagens e memória
crescendo sem parar. Para cada um: o relógio da página do editor não atrasa (menos de 500 ms, ou
1 s nos dois últimos), o Parar para, e o código consertado volta a rodar.

### O defeito que o teste achou, e o conserto

Com o jogo preso, o editor respondia e o Parar voltava ao estado parado, mas **o jogo consertado só
rodava quando o travamento antigo terminava**. Trocar o `srcdoc` do mesmo iframe espera o processo
preso. Medido numa página mínima, com um travamento de 20 s:

| O que se faz com o iframe preso | Tempo até o documento novo rodar |
|---|---|
| trocar o `srcdoc` do mesmo iframe | 19 029 ms |
| ir para `about:blank` e depois trocar o `srcdoc` | 19 032 ms |
| tirar o iframe e pôr um novo no lugar | **20 ms** |
| tirar, esperar 300 ms e pôr um novo | 316 ms |

Conserto em `PreviewIframe.tsx` (a `key` do iframe, `frameGeneration`):

1. **Parar** sempre põe um iframe novo no lugar, por qualquer caminho (barra, cartão de travado, host).
2. **Rodar de novo** com a prévia sem dar sinal de vida há mais de 2,5 s também.
3. **Vigia da troca:** um documento novo que não carrega em 3 s ganha um iframe novo, uma vez por
   documento. É o caso de quem conserta o código e aperta Rodar em seguida: o Estúdio ainda roda o
   código antigo (a edição chega à prévia com 800 ms de atraso) e o novo ficaria esperando.

No caminho normal (editar, Rodar de novo com o jogo vivo) o iframe continua o mesmo: remontá-lo a
cada edição já deixou a prévia em branco de vez em quando, e isso não mudou.

**Portão:** as cinco aulas dos cursos gravados (`protected-lessons.spec.ts`) e as suítes de
segurança da prévia rodam depois desta mudança; o resultado está no README desta pasta.

## B1: a marca de execução (17/11/2026)

Onde a prévia NÃO é isolada, um jogo preso congela a aba inteira. A criança fecha a aba, abre o
projeto de novo, a prévia roda sozinha e trava outra vez: o projeto fica impossível de abrir.

`components/preview/runTripwire.ts` + `PreviewIframe.tsx`:

- ao começar a rodar um jogo, grava uma marca do projeto no `localStorage` (síncrono, antes de o
  jogo começar);
- a marca sai com três batimentos do jogo, ao Parar, ao fechar o editor e ao recarregar ou sair
  com a página viva (`pagehide`). Numa aba congelada nada disso roda, e ela fica;
- ao abrir um projeto com a marca, a prévia **não roda sozinha**: fica parada, com o Rodar à vista.

Provas: teste de unidade em `PreviewIframe.test.tsx` e, no navegador, o caso "depois de uma
execução interrompida, a prévia espera o Rodar" de `preview-hostile-programs.spec.ts` (jogo vivo
tira a marca; recarregar com a página viva roda sozinho como sempre; com a marca, espera o Rodar).

Limites, ditos com clareza:
- a marca que o teste usa é posta à mão: não há aqui um navegador sem isolamento para congelar a
  aba de verdade;
- na sessão inicial, "salvar antes de cada Rodar" não estava implementado. A continuação agora
  drena os buffers e aguarda o serviço existente antes de Rodar/Rodar de novo. Parar cancela a
  execução solicitada, sem cancelar a gravação; mudança de projeto, autoridade ou revisão e
  falhas impedem uma execução tardia. O documento anterior permanece enquanto a gravação está
  pendente, para o debounce automático não executar a revisão antes da confirmação;
- fora de um comando explícito, a atualização automática ainda segue o autosave (1 s depois da
  edição, 5 s no máximo); uma queda antes dessa gravação ainda pode perder a última edição;
- um jogo que só trava depois de alguns segundos rodando (passou dos três batimentos) não deixa
  marca.

## O que falta no pacote B

- **Salvar antes de rodar:** implementado nos comandos explícitos; falta homologar o fluxo pelo
  app conectado e a troca real de perfil, além das provas de laboratório.
- **B2 (casca em outra origem):** só faz sentido medir e decidir depois de saber o que acontece no
  Firefox, no Safari e no Android. Depende também de um fato de deploy: o domínio do
  `studio-runtime` precisa ser de outro **site** em relação aos apps. Não implementado.
  Escolher e configurar esse domínio é decisão dela (é mudança de deploy, não só de código).
- **B4 (Jogo 2D em Worker):** estudo, não feito.
- **Outros navegadores:** rodar o script com `SZ_MEASURE_BROWSERS=chromium,firefox,webkit` numa
  máquina que os tenha, e num Android de verdade.

## Troca do jogo preso: intervalo sem iframe (18/11/2026)

A verificação no Windows (Chromium 148 completo) reprovou um caso: depois de 30 s de trabalho
síncrono que não é laço, o conserto não rodava em 15 s, mesmo com o Parar respondendo. A hipótese
de trabalho: no Chromium completo os iframes com sandbox da mesma página dividem um processo, e o
iframe novo, criado no mesmo instante em que o antigo sai, cai no processo ainda ocupado.

O que mudou em `PreviewIframe.tsx`: quando o jogo que sai estava sem responder, a página fica um
instante **sem iframe nenhum** (200 ms) antes de montar o novo, para o navegador descartar o
processo. Se o documento novo não carregar em 3 s, tenta de novo com intervalo maior (1,2 s e
depois 3,5 s), até três vezes por documento. Jogo que responde (o caso das aulas) troca como
antes, sem intervalo.

O que está provado e o que não está:

- Os cinco programas hostis passam no Chromium 153 e no Chromium 148 (o mesmo número de versão do
  Windows, baixado para esta medição), os dois em Linux.
- **A falha do Windows não foi reproduzida em Linux**, nem no editor nem numa página mínima (lá o
  iframe novo roda em 30 a 50 ms mesmo sem intervalo). Portanto a correção segue a hipótese, mas
  **não está provada no ambiente em que o defeito apareceu**. O portão fica aberto até alguém
  rodar `e2e/preview-hostile-programs.spec.ts` no Windows.

## Lote 3 de 19/11/2026: vigia em outra origem, casca em outro site, decisão do WebKit

### 3.1 O vigia funcionava só com `srcdoc`

Com a prévia em outra origem (`previewOriginAdapter`, usado nas Oficinas ao vivo) o iframe usa
`src`, e `PreviewIframe` lia o documento carregado com `getAttribute('srcdoc')`, que ali é nulo.
Resultado: a detecção de jogo preso, a troca do iframe preso no Parar e o Rodar de novo com a
prévia muda ficavam desligadas nesse modo. Agora o componente guarda qual documento o iframe
mostra. Teste: `PreviewIframe.test.tsx` "em outra origem, o Parar reconhece o jogo preso" (falha
com a leitura antiga).

### 3.2 A casca em outro site

O arranjo que isolou o Firefox na medição de 18/11 (página de outro site + COOP/COEP no host,
recebendo o documento por mensagem e pondo num `srcdoc` interno) virou produto, **desligado por
padrão**:

- Contrato e página: `packages/core/src/studio/classic-shell.ts` (`sz-shell:ready`, `sz-shell:load`,
  `sz-shell:loaded`). A casca confere a origem do host contra a lista do servidor, repassa as
  mensagens nos dois sentidos e barra qualquer `sz-shell:*` vindo do jogo. Para o host, o
  `targetOrigin` é a origem exata dele; para o jogo, é `'*'`, porque o jogo tem origem opaca (sandbox
  sem `allow-same-origin`) e nenhuma origem nomeada o alcança. Quem garante o destino é a referência
  da janela (`frame.contentWindow`), e o jogo não recebe nada que o host não mandaria ao `srcdoc`
  direto.
  O jogo dentro dela leva o MESMO sandbox (`allow-scripts allow-modals allow-pointer-lock`).
- Rota: `packages/studio-runtime/src/classic-shell.ts`, em `/v1/classic-shell/1.html`. Sem
  `STUDIO_CLASSIC_SHELL_PARENT_ORIGINS` a rota responde 404: nenhum deploy muda até alguém
  configurar. Cabeçalhos: só `frame-ancestors` na CSP (um `srcdoc` herda a política de quem o
  embute; qualquer outra diretiva restringiria o jogo), COEP `credentialless`, CORP `cross-origin`.
- Editor: prop `previewShellUrl` (`StudioCommonProps`). Ignorada com `previewOriginAdapter` ou
  `requireIsolatedPreview`. O documento do jogo é o mesmo, sem um byte a mais: só o `parentOrigin`
  passa a ser o da casca (o valor já muda de um deploy para outro).
- Prova no navegador: `e2e/preview-shell.spec.ts` (playground com `?casca=1`, casca na outra
  origem local). Chromium: o jogo roda, fala com o console, Parar e Rodar funcionam, e o editor
  responde durante 30 s de trabalho síncrono do jogo. Firefox e WebKit: registrados no
  `playwright.config.ts` (qualificação por render e resposta real, `e51d3bb7`), rodam na CI da
  missão.

**Ligada em staging em 20/11/2026** (decisão da dona; produção de fora): `STUDIO_CLASSIC_SHELL_ENABLED=1`
no staging dos dois apps faz o layout raiz entregar a URL ao Estúdio (`classicShellUrlFromEnv`), a
lista de origens do editor é secret do Worker de staging, e o `frame-src` já liberava a origem do
runtime. **COEP não foi ligado, e não precisa:** a medição de 20/11
([`2026-11-20-studio-firefox-site-isolation.md`](../qa/2026-11-20-studio-firefox-site-isolation.md))
mostrou que a necessidade de COOP + COEP no Firefox era do Firefox do Playwright, que desliga os
iframes em outro processo (`fission.webContentIsolationStrategy = 0`). No Firefox de mesa a casca
isola com qualquer combinação de cabeçalhos do host, também na página da aula com vídeos.

**Conferência no app logado (20/11, tarde):** [`../qa/2026-11-20-studio-casca-staging.md`](../qa/2026-11-20-studio-casca-staging.md).
O isolamento, o Parar e o conserto passaram no Chrome de verdade; as setas não chegavam ao jogo depois
de Rodar (conserto `590c6ff48`, com e2e). A página da casca é servida pelo Worker, que só pode sair
junto de uma imagem qualificada (o Worker confere o perfil de validação contra o da imagem); até lá
a casca está desligada no staging (`STUDIO_CLASSIC_SHELL_ENABLED=0`). O teto de 790 000 do Reino Zero (`reino-zero-performance.spec.ts`)
mede o `srcdoc` do modo direto; no modo casca o documento é o mesmo, entregue por mensagem.

### 3.3 WebKit: decisão registrada

Medido em 18/11 (Linux e Windows): no WebKit 26.4 nenhum arranjo de iframe isolou (srcdoc, outro
site, outro site com COOP/COEP: ~5 s de travamento do editor). Um Worker dedicado isolou a CPU,
mas o WebKit não tem `transferControlToOffscreen` nem 2D/`requestAnimationFrame` em Worker. O
Jogo 2D (11 mil linhas no documento, DOM, eventos, áudio e imagens) não roda em Worker sem um
proxy de DOM, o que mudaria o que as aulas protegidas ensinam e não cabe nos 57 bytes de folga.

Decisão: no WebKit a proteção continua a de hoje (vigia, marca de execução interrompida, troca do
iframe preso, guarda de laço, limite de mensagens). Isolamento completo ali exige o Jogo 2D em
Worker com proxy de DOM (estudo B4), fora deste lote. Uma saída ainda não medida é a janela
própria aberta com `noopener` (troca de processo no WebKit); fica registrada como pendente.

**A janela própria, medida em 20/11/2026.** O `measure-preview-isolation.mjs` ganhou o arranjo
`janela-noopener`: o jogo numa janela de OUTRO site aberta com `noopener`, que trava 5 s assim que
abre. Sem `opener`, a página não fala com a janela; a prova de que o clique caiu dentro do
travamento vem dos relógios de parede dos dois lados. WebKit 27.2 do Playwright, Windows 11 (a
máquina da dona), uma observação por linha:

| Cabeçalhos do host | `srcdoc` (o de hoje) | Janela de outro site com `noopener` |
|---|---|---|
| nenhum | 5.042 ms / 4.572 ms | **82 ms / 44 ms** (janela travada 5.029 ms, clique dentro) |
| COOP + COEP | 5.045 ms / 4.553 ms | **68 ms / 36 ms** (janela travada 5.012 ms, clique dentro) |

(atraso do relógio do editor / clique atendido em.) O job `isolation-measurement` da homologação
passou a medir o arranjo nas três engines.

**Leitura:** no WebKit a janela própria isola; o iframe não. Mas levar o jogo para lá muda a
experiência: o jogo sai de dentro do editor (outra aba no iPad), a página não manda mais o
documento nem recebe o console, o erro e o batimento (sem `opener` não há canal; um canal pelo
servidor seria peça nova), o Parar da página não alcança a janela, e o documento precisa morar
num endereço de outro site (hoje só a sala ao vivo publica um documento temporário). Por isso
**não foi implementado**: é decisão da dona, a ser levada como proposta com as fotos do app (o
"jogar numa janela própria" só no WebKit), junto do que se perde. Até lá, a proteção do WebKit
segue a de cima.

## Lote 2 de 21/11/2026: os nove programas hostis da missão e uma troca de iframe que atrapalhava

A seção 5 do texto original lista nove tipos de programa problemático. Os dois arquivos de teste
(`preview-hostile-programs.spec.ts`, prévia no `srcdoc` direto, Chromium; e
`preview-shell-hostile.spec.ts`, prévia na casca, Chromium e Firefox) passaram a usar os mesmos
programas, em `e2e/helpers/hostilePrograms.ts`:

| Programa | O que se confere além do editor sobreviver |
|---|---|
| laço infinito (`while (true)`) | a guarda corta em ~4 s e as Mensagens do jogo dizem "laço interrompido" |
| recursão sem fim | o cartão "Opa, a página parou" |
| trabalho síncrono de 30 s que não é laço | — |
| memória crescendo sem parar | — |
| renderização pesada (1920 por 1080, 120 mil retângulos e um desfoque da tela inteira por quadro) | — |
| erro de compilação | o cartão "Opa, a página parou" |
| erros de física no Jogo 2D (gravidade NaN, 1.500 caixas com velocidade NaN e infinita colidindo, um "Quando encostar" que lança) | o cartão "Opa, o jogo parou" e, em "O que o computador disse", "parei o bloco “Quando encostar”" |
| enxurrada de eventos (500 ouvintes, 2.000 teclas falsas por volta e 2.000 mensagens forjadas para a página, com a forma das que o editor lê) | — |
| enxurrada de mensagens no console | — |

"O editor sobrevive" passou a incluir o pedido da missão de que ele **possa salvar o projeto**:
com o programa hostil rodando, o Salvar do menu ⋯ responde e o selo volta a "Salvo" (o selo só
volta depois que o banco confirma). Depois disso vale o de antes: relógio do editor abaixo de
500 ms (1.000 ms nas duas enxurradas e na memória), Parar em menos de 5 s e o conserto rodando.

Resultado local (Windows, Chromium 159 completo e Firefox do Playwright com o isolamento por site
de mesa): 10 de 10 no `srcdoc` e 9 de 9 na casca nos dois navegadores. O WebKit continua fora (B4).

### O defeito que o laço achou

Com o laço no topo do programa, o aviso "laço interrompido" às vezes nunca aparecia, e a prévia
seguia dizendo "Rodando". Medido com o efeito instrumentado: o vigia da troca (`swapRescueRef`,
que troca o iframe quando um documento novo não dá `load` em 3 s) achava que o processo estava
preso pelo jogo ANTERIOR e trocava o iframe três vezes. Cada iframe novo rodava o laço de novo e
prendia antes de a guarda (4 s) cortar; o aviso só chegava ~15 s depois.

A causa: o vigia distingue "processo preso pelo anterior" de "documento que só demora" pelo
batimento imediato do documento novo (achado E3), mas no Chromium o batimento de um documento que
prende a tarefa logo no começo só sai quando a tarefa acaba (em duas de três rodadas ele não
chegou). Conserto (`PreviewIframe.tsx`, corrigido depois da revisão do lote 2), a primeira troca
não arma quando:
- o que está carregado NESTE iframe é o documento em branco (depois do Parar, na abertura, com a
  marca de execução): ele não tem programa e não segura processo nenhum. Só vale se o branco
  entrou no iframe atual: depois de uma troca, o iframe novo pode ter caído no processo ainda preso
  (e2e `preview-startup`, que reprovou com a primeira versão desta regra);
- o documento anterior falou há menos de 1,2 s (o batimento é de 1 por segundo): estava vivo.

O novo que não entra nesses casos está preso em si mesmo; trocar não adianta, e ele fica com o
vigia de batimentos ("O preview parece travado") e o Parar. Um anterior que falou e calou há mais
de 1,2 s conta como preso, e o resgate segue como antes. A primeira versão usava 2,5 s e olhava só
o anterior vivo; a revisão do lote 2 mostrou que, partindo do parado, as três trocas continuavam,
e que um jogo travado havia menos de 2,5 s deixava o documento novo esperando. Os avisos próprios
da casca (`sz-shell:ready`, `sz-shell:loaded`) deixaram de contar como sinal de vida do jogo: o
pronto da casca nova parava a cadeia de trocas na primeira tentativa. Testes em
`PreviewIframe.test.tsx`: "anterior vivo no pedido", "anterior calado há 1500 ms" e "há 3000 ms"
(o caso real do resgate) e "começar do parado".

Efeito colateral visto no trace: o gravador do Playwright tira retrato de todos os quadros a cada
passo e espera o iframe preso, então com `--trace` os passos ficam lentos enquanto o programa
hostil roda (o trabalho síncrono de 30 s foi de 18 s para 37 s de teste). Medido sem o trace, o
editor fica responsivo o tempo todo: `evaluate` de 1 a 3 ms e nenhum atraso de relógio acima de
120 ms. Antes, as trocas indevidas matavam o iframe e escondiam isso.

### Liberação de recursos, medida do lado do jogo (lote 2, 21/11/2026)

`e2e/preview-resource-release.spec.ts` (Chromium completo, a prévia em outro processo), um jogo de
cada família: Jogo 2D (Mini plataforma), Jogo 3D (Cubo girando) e Jogo 3D Avançado (Defesa da
Torre Profissional). Local, Windows, com placa de vídeo; evidência em
`evidencias/liberacao-de-recursos-2026-11-21/windows-local.json`:

| Jogo | CPU em 2 s rodando (renderização / GPU) | CPU em 2 s parado | Documentos no processo da prévia, parado, após 1 e 10 ciclos | Memória do jogo no 1º e no 10º Rodar |
|---|---|---|---|---|
| Mini plataforma | 141 / 202 ms | 24 / 5 ms | 1 e 1 | 1,8 e 1,8 MB |
| Cubo girando | 156 / 180 ms | 16 / 3 ms | 1 e 1 | 3,7 e 3,7 MB |
| Defesa da Torre Profissional | 162 / 264 ms | 17 / 3 ms | 2 e 2 | 4,4 e 4,5 MB |

Critérios do teste, exatamente como estão no código: CPU parada abaixo de um quarto da rodando
(piso de 100 ms na renderização, que é o editor, e 30 ms na GPU); os mesmos quadros na página e
os mesmos documentos no processo da prévia depois do 1º e do 10º Parar (contados com o jogo
parado); a memória do 10º Rodar abaixo de 1,5 vez a do 1º mais 1 MB, as duas medidas 1,5 s depois
do primeiro quadro. O áudio não é medido à parte (o Blockly do editor mantém `AudioContext`
próprios ligados), e a contagem de processos vai para a evidência sem critério: os iframes com
sandbox da mesma página dividem um processo.

**O vazamento que a medida achou.** Na primeira medida, a memória do Jogo 2D ia de 2,0 para
3,4 MB em dez ciclos. Contando os documentos do processo da prévia: cada Parar e Rodar deixava um
documento e um quadro presos, mesmo com um programa vazio (8 ciclos, 8 documentos a mais; 30 s e
coleta de lixo forçada depois, eles continuavam lá). O retrato da memória mostrou quem segura: o
`LocalFrameMojoHandler` do Chromium, por uma raiz persistente da API de postura do aparelho, no
quadro descartado. Oito edições no MESMO iframe não deixaram nada; o que vazava era a troca de
iframe que todo Parar fazia, mesmo com o jogo vivo. Conserto (`PreviewIframe.tsx`): com o jogo
vivo, o Parar leva o próprio iframe ao documento em branco; a troca fica para o jogo preso, e a
rede de segurança troca como preso se o branco não entrar em 2 s (com 800 ms, um 3D pesado numa
máquina carregada às vezes não soltava a tempo). A guarda nova (documentos com o jogo parado)
reprova com o Parar antigo: 9 documentos contra 1.

**Observação do editor, fora do jogo:** o serviço de áudio do Chromium segue gastando ~14 ms por
segundo com o jogo parado. É do próprio Blockly: cada área de blocos cria um `AudioContext` (três
no editor aberto, todos `running` no Playwright, que libera áudio sem gesto). No Chrome de verdade
um contexto criado antes de um gesto nasce suspenso; depois do primeiro som do Blockly ele fica
ligado enquanto o editor estiver aberto. Não é recurso do jogo; fica registrado para o relatório de
eficiência do editor (lote 8).

### B4 no WebKit: decisão (lote 2, 21/11/2026)

**Fica a proteção de hoje; a janela própria não é implementada.** Recomendação minha, registrada
para a dona confirmar ou reverter no relatório do lote.

Pelos números de 20/11, a janela de outro site aberta com `noopener` isola no WebKit (relógio do
editor 44 a 82 ms, contra 5 s do iframe). O custo é alto: no iPad o jogo sai do editor para outra
aba, a página perde o console, o erro com o bloco e o Parar, e o documento precisa morar num
endereço de outro site (peça de servidor nova). O que sobra de risco no WebKit sem ela é pequeno:
- laços (`for`, `while`, `do`) são cortados pela guarda em ~4 s, com o aviso "laço interrompido";
- recursão sem fim vira erro em milissegundos ("Opa, a página parou");
- o que prende a aba é trabalho síncrono pesado que não é laço (uma ordenação de milhões de itens,
  uma lista gigante), raro nos programas das crianças;
- se a aba congelar, a marca de execução faz a próxima abertura esperar o Rodar, e o projeto não
  prende de novo;
- a renderização pesada deixa o editor lento, mas o Parar responde entre um quadro e outro.

Se um dia o WebKit ganhar `OffscreenCanvas` 2D com `requestAnimationFrame` em Worker, o Jogo 2D em
Worker volta a ser o caminho (estudo B4 original).

### Teclado preso no 3D do Windows: medido de novo (lote 2, 21/11/2026)

Diagnóstico de entrada no HEAD `756ce2cfa` (rodada 44910663160, os jogos 3D e 2D pesados da
galeria repetidos 10 vezes, Chromium completo, runners sem placa de vídeo): Linux 100 de 100;
Windows 4 falhas em ~100, todas nos dois jogos Patrulha Espacial (20/11: 2 de 50).

| Falha | Causa | O que foi feito |
|---|---|---|
| 1 | o teste tratava como defeito o aviso "modo leve ligado" do Jogo 3D Avançado, que o orçamento de desenho dá de propósito numa máquina lenta | os coletores de diagnóstico da galeria passam por `isExpectedNotice`, que aceita esse aviso e o do driver ANGLE |
| 3 | o primeiro quadro ou a resposta às teclas passou de 15 s: o 3D desenhado por software (sem GPU) num runner Windows de 2 núcleos | registrado; não é o editor (os programas hostis e a liberação de recursos mostram o editor responsivo) e entra no lote 4 (motores), que mede o primeiro quadro do 3D sem placa de vídeo |

O que o diagnóstico de 20/11 atribuiu ao `srcdoc` no mesmo processo do editor não se confirma
no Chromium completo: a prévia roda em outro processo. O gargalo é a GPU por software, que todos
os processos dividem.
