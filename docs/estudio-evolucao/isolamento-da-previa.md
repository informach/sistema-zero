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
