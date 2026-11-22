# Homologação A a H (seção 17 da missão)

Lote 8, 21/11/2026. A régua é a seção 17 de [`missao-original.md`](missao-original.md): "A
implementação só deve ser considerada completa depois de ser exercitada com projetos reais e
cenários de estresse." Para cada item que a seção pede há uma linha com o que foi feito, a prova
versionada e onde ela foi conferida.

Nada foi rodado de novo para escrever este documento. As marcas vêm dos registros citados: os
documentos desta pasta, os relatórios de `docs/qa/` e as rodadas do GitHub Actions consultadas em
21/11/2026 (`gh run list` e `gh run view`, só leitura). Escrito com o Estúdio em `7fb0c4f30` e
atualizado no fim do lote 8, depois da homologação integral em `d2f238b62` e do full review final
(até `b182d1313`).

## As marcas

| Marca | Quer dizer |
|---|---|
| CI Linux | passou num job do GitHub Actions em `ubuntu-24.04`, na rodada citada |
| CI Windows | passou num job em `windows-2025`, na rodada citada |
| Windows local | rodado na estação Windows 11 da equipe (Ryzen 5 5600G, 32 GB, estação compartilhada) e registrado no documento citado |
| staging logado | conferido no app de staging com a conta da equipe, no Chrome de mesa |
| emulado | CPU do editor desacelerada pelo CDP (4x ou 6x), só no Chromium, no `studio-modest-device.yml` |
| não verificado | sem rodada registrada, ou ainda não feito |

## Estado do CI quando este documento foi escrito

- **Homologação integral (`.github/workflows/studio-mission.yml`).** Roda sob pedido
  (`workflow_dispatch`) ou em push numa branch `estudio-missao-*`. A última rodada com os 12 jobs
  verdes é a **44860362872**, em `48a8d0f05` (21/11, 03:17 UTC). A última rodada é a
  **44904766980**, em `1dd1f51c6` (21/11): 11 de 12 jobs verdes; o shard 1 do Chromium no Linux
  reprovou, e a revisão do lote 1 atribui a falha ao `css-learning.spec.ts`, intermitente
  ([`revisao-2026-11-20.md`](revisao-2026-11-20.md)). **Homologação integral no fim do lote 8:
  44949817617, em `d2f238b62`** (os lotes 2 a 7 e a revisão dos lotes 6 e 7): 11 de 12 jobs verdes,
  inclusive as cinco aulas protegidas (66 de 66 objetivos, capturas abaixo), o Firefox, o WebKit, o
  Windows e o Python. O job `contracts` do Linux reprovou num teste do Estúdio que passava por sorte
  de tempo ("o resultado acompanha o programa", que esperava só um `setTimeout(0)` pelo evento do
  Blockly), consertado em `b182d1313`. Homologação seguinte, **44954172658 em `7b00717b6`**
  (todos os consertos do full review): 10 de 12 verdes; reprovaram o `css-learning.spec.ts` no
  shard 1 do Chromium (o intermitente que já tinha reprovado em `1dd1f51c6` e passou em
  `d2f238b62`) e, no `contracts` do Linux, um caso do `ProjectList.creationScope` (a janela de
  projeto novo sem a opção "Com código" na abertura; passa 3 de 3 localmente e não tinha falhado
  antes). Os dois ficam como intermitentes observados, pendentes de investigação. O CI do
  `7b00717b6` passou no lint, nos testes do Estúdio e no typecheck de todos os pacotes.
- **CI do monorepo (`.github/workflows/ci.yml`, a cada push na staging).** Desde `61ef65f2d`
  nenhuma rodada terminou inteira: as seguintes foram canceladas por pushes novos ou ainda estavam
  rodando. O job `ci` reprova no lint (`biome ci`) por arquivos de outras frentes
  (`docs/arquipelago-manual/index.html` e
  `docs/aulas-interativas-legado/desafio-primeiro-jogo-v6/interacoes/protecao.html`, rodada
  44944817526), e os passos seguintes daquele job não chegam a rodar. Os três shards do Chromium da
  suíte do Estúdio (o projeto `chromium` inteiro de `packages/studio/playwright.config.ts`, com até
  duas novas tentativas no CI) terminaram verdes juntos em `2bed3c2da`, `6d495f877`, `33cd419d8` e
  `f3b11d15a`, nesta ordem. Os jobs do Estúdio no Firefox e no WebKit ficaram verdes em várias
  rodadas; a última terminada é a de `ee82d0dfd` (44944817526).
- **Workflows específicos.** `studio-classic-equivalence.yml` verde em `ee82d0dfd` (44944817550);
  `studio-export.yml` verde em `ee82d0dfd` (44944817571); `studio-engines.yml` verde em
  `d2b6ef238` (44944417041); `studio-modest-device.yml` rodou em `e5391751a` (44896882655), com os
  números em [`aparelho-modesto-emulado.md`](aparelho-modesto-emulado.md).

## Resumo

| Jogo | Estado | Onde foi conferido |
|---|---|---|
| A. Cadê Todo Mundo? | feito | CI Linux, CI Windows, Windows local, staging logado |
| B. Desafio do Primeiro Jogo | feito | CI Linux, CI Windows, Windows local, staging logado |
| C. Clássico com milhares de blocos | parcial | CI Linux, CI Windows, Windows local, emulado; três itens não verificados |
| D. Jogo 2D de grande porte | não feito | só peças isoladas, listadas na seção D |
| E. Jogo 3D de exploração | não feito | só peças isoladas, listadas na seção E |
| F. Projeto Pro grande | parcial | CI Linux, CI Windows, Windows local, emulado |
| G. Python | parcial | CI Linux, staging logado; os custos separados não foram medidos |
| H. Falhas intencionais | parcial: 7 de 10 com prova no navegador | CI Linux, CI Windows, Windows local, staging logado, emulado |

"Feito" em A e B quer dizer que os itens pedidos têm prova. As lacunas que ficam (os vídeos
gravados, nunca acessados, e os 6 de 6 da parte 4 do Desafio com a casca ligada) estão escritas em
cada linha.

## A. Cadê Todo Mundo?

Duas aulas com Estúdio: aula 1 (22 gestos) e aula 2 (35 gestos), refeitas pelo robô que gravou as
aulas (`packages/studio/e2e/helpers/palco.ts`) dentro de `packages/studio/e2e/protected-lessons.spec.ts`.

| Item | O que foi feito | Prova | Onde foi conferido |
|---|---|---|---|
| Blocos | Os 23 tipos de bloco ensinados no Cadê (35 nos dois cursos) estão na matriz com texto, caminho na paleta, cor, campos e padrões; os projetos das aulas gravam de volta iguais e geram o código guardado | `docs/aulas-interativas-tecnico/qa/matriz-compatibilidade.test.ts` (43 testes), `packages/studio/src/blockly/__tests__/protectedCourses.test.ts` (15), `protected-lessons.spec.ts` | CI Linux e CI Windows (jobs `contracts` e `browsers`, rodadas 44860362872 e 44904766980); CI Linux (`ci.yml`, shards do Chromium verdes em `f3b11d15a`); Windows local (43 + 15 testes e os 399 gestos, [`plano-execucao.md`](plano-execucao.md)) |
| Variáveis | A contagem dos achados ("contar sem recontar") é objetivo de execução; a parte "contar-achados" da aula 2 passa com 4 de 4 | `packages/studio/scripts/check-lesson-objectives.ts` com o executor do servidor (`studio-runtime/runtime/check-objectives.mjs`); `evidencias/a3-depois-windows/cade-todo-mundo-aula-2/contar-achados.objetivos.json` | CI Linux, CI Windows, Windows local |
| Eventos | Clique e toque em sprites de grupo (`sz_g2d_on_group_click`, "Quando clicar/tocar num sprite do grupo"), refeitos pelos gestos; o passo "Clicar no sprite … do grupo" de Meus testes foi conferido com o jogo final do Cadê (clicar no esconderijo2 conta um achado) | `protected-lessons.spec.ts`; `packages/studio/e2e/student-tests.spec.ts` (Chromium, Firefox e WebKit) | CI Linux (`ci.yml`: Chromium, Firefox e WebKit); Windows local |
| Visibilidade | "Deixar o sprite … com … % de visibilidade" (`Jogo 2D → Sprites → Aparência`). Prova de que o teste morde: com o texto trocado para "Tornar o sprite…", a aula 1 reprova no gesto 14 | [`README.md`](README.md), seções A2 e A3 | O teste: CI Linux e CI Windows. A sabotagem foi feita em 17/11 na sessão em Linux fora do CI |
| Imagens | A troca das imagens do jogo na parte "personalizar" da aula 2, pelos gestos do roteiro; o jogo da aula 2 rodou na casca isolada, com o jardim desenhado | `protected-lessons.spec.ts`; [`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md) | CI Linux, CI Windows, Windows local; staging logado (21/11) |
| Execução | Os objetivos de execução rodam o jogo no executor de verdade do servidor (no Cadê, 2 na aula 1 e 4 na aula 2; 17 nos dois cursos). Desde `ae53e7ca0` o CI não aceita objetivo sem nota | `protected-lessons.spec.ts` com `SZ_CHECK_CHROMIUM`; [`../qa/2026-11-20-studio-course-generation-and-undo.md`](../qa/2026-11-20-studio-course-generation-and-undo.md) (17 aprovados, zero sem medição) | CI Linux, CI Windows, Windows local |
| Verificação | "Verificar projeto" na página real da aula: Cadê adulto, aula 1, parte 4, 2 de 2 objetivos | [`../qa/2026-11-20-studio-casca-staging.md`](../qa/2026-11-20-studio-casca-staging.md) | staging logado (20/11, com a casca desligada; e 21/11 com a casca ligada, de novo 2 de 2, [`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md)) |
| Salvamento | Rodar só depois de gravar; recarregar logo depois de uma mudança traz a mudança; os rascunhos de aula têm testes no member-shell (linha 7 de [`persistencia-matriz.md`](persistencia-matriz.md)); no staging, recarregar 50 ms depois de Rodar trouxe o último código inteiro | `packages/studio/e2e/run-save-revision.spec.ts`, `packages/studio/e2e/reload-flush.spec.ts`, `packages/member-shell/tests/lesson-draft-*.test.ts` | CI Linux (`ci.yml`), CI Windows (job `browsers` do Windows, 44904766980), staging logado (20/11). Lacuna: o servidor guarda uma versão anterior do envio, e dois reenvios apagam a original (lacuna 5 da matriz) |
| Envio | "Enviar meu projeto" respondeu "Projeto enviado! Foi em 20/11/2026, 11:15:18." e "Concluir aula" respondeu "Aula concluída!"; com a casca ligada, "Enviar de novo" respondeu "Projeto enviado! Foi em 21/11/2026, 18:13:39." | [`../qa/2026-11-20-studio-casca-staging.md`](../qa/2026-11-20-studio-casca-staging.md), [`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md) | staging logado (20/11, casca desligada; 21/11, casca ligada) |
| Resultado visual e funcional | Capturas de cada parte antes (17/11) e depois (19/11); o jogo montado pelos gestos é o projeto final do curso, linha por linha | `evidencias/a3-antes/`; `evidencias/a3-depois-windows/manifesto.json` (`sourceCommit` `0b169f83`, Chromium 148 completo, 399 gestos, 66 objetivos aprovados) | Windows local (19/11). Depois das mudanças de 20 e 21/11: as 13 capturas e os 66 objetivos em `evidencias/a3-depois-2026-11-21-ci/` (homologação 44949817617, `d2f238b62`, Chromium 159 completo no Windows Server 2025). Vídeos gravados: nunca acessados |

## B. Desafio do Primeiro Jogo: A Chave do Farol

Três dias com Estúdio: dia 1 (55 gestos, 5 de 5 objetivos de estrutura e 4 de 4 de execução), dia
2 (99 gestos, 19 de 19 e 2 de 2) e dia 3 (188 gestos, 25 de 25 e 5 de 5), números de 17/11 no
[`README.md`](README.md), mantidos nas rodadas seguintes.

| Item | O que foi feito | Prova | Onde foi conferido |
|---|---|---|---|
| Controles | "Ativar controles clássicos" com "só as quatro direções" (`Jogo 2D → Controles → Teclado, ações e toque`), com teclado e com as setas da tela | `protected-lessons.spec.ts` (dia 1); matriz | CI Linux, CI Windows, Windows local |
| Movimento | "Mover sprite em 4 direções com setas" (`Jogo 2D → Movimento → Movimentos prontos`) e "Manter o sprite … dentro da tela"; objetivo de execução das quatro direções | `protected-lessons.spec.ts`; [`../qa/2026-11-20-studio-casca-staging.md`](../qa/2026-11-20-studio-casca-staging.md): Desafio no Kids, aula 1, parte 6, de 1 de 3 para 3 de 3 com o bloco "Manter o sprite personagem dentro da tela" | CI Linux, CI Windows, Windows local, staging logado (20/11) |
| Colisões | "Quando o sprite … começar a encostar no sprite …" (`Jogo 2D → Colisões → Encostar e bloquear`) e "Destruir o sprite" | `protected-lessons.spec.ts` (dia 2) | CI Linux, CI Windows, Windows local |
| Variáveis | "Criar variável", "Alterar variável" e "Somar … em variável" (`Programação → 🏷️ Variáveis`); objetivo "Guarde a coleta e continue com a chave ao se afastar." | `evidencias/a3-depois-windows/desafio-dia-3/decisao.objetivos.json` | CI Linux, CI Windows, Windows local |
| Condições | "Se" com "senão" (`Programação → ❓ Lógica & Se`) | o mesmo arquivo de objetivos | CI Linux, CI Windows, Windows local |
| Chave e porta do farol | Objetivos "Com a chave, acenda o farol e chame o barco." e "Sem chave, mantenha o farol apagado e mostre um aviso.", os dois de execução | `decisao.objetivos.json`; `docs/aulas-interativas-tecnico/qa/desafio-farol-browser.ts` (farol que não muda reprova) | CI Linux, CI Windows, Windows local |
| Troca de imagens | "Trocar imagem do sprite … para …"; o objetivo confere que a imagem do farol muda ao vencer, pelo nome curto `sprite.imageName` | `packages/studio/CLAUDE.md` (seção de 29/10); objetivos de execução | CI Linux, CI Windows, Windows local |
| Mensagens | "Escrever …" e "Mostrar placar …" (`Jogo 2D → Vida e placar → Indicadores e texto na tela`); parte "farol-mensagens" do dia 3 | `evidencias/a3-depois-windows/desafio-dia-3/farol-mensagens.objetivos.json` | CI Linux, CI Windows, Windows local |
| Reinício da partida | O gesto `[rodar de novo]` do roteiro do dia 2 ("Para ver, clique em Rodar de novo, no alto do Estúdio") é refeito pelo robô. O antigo "Atualizar o preview" do palco não existe desde o redesenho (achado A5, conferido em 17/11) | `docs/aulas-interativas/faisca/desafio-primeiro-jogo/desafio-dia-2.roteiro.md`; `protected-lessons.spec.ts` | CI Linux, CI Windows, Windows local |
| Verificação e envio | Desafio no Kids, aula 1, parte 6: "Projeto enviado! Foi em 20/11/2026, 11:25:30." e "Aula concluída!" (+10 XP, +5 moedas); com a casca ligada, parte 4: Verificar respondeu (0 de 6 no projeto inicial) e "Projeto enviado! Foi em 21/11/2026, 18:15:56." | [`../qa/2026-11-20-studio-casca-staging.md`](../qa/2026-11-20-studio-casca-staging.md), [`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md) | staging logado (20/11, casca desligada; 21/11, casca ligada) |
| Posições e caminhos visuais | Cada caminho dos roteiros achado na paleta real da aula (matriz); o robô acha cada bloco pelo texto da paleta, como na gravação; a parte "decisao" do dia 3 monta o projeto final do curso, linha por linha | matriz; `protected-lessons.spec.ts`; capturas em `evidencias/a3-antes/` e `evidencias/a3-depois-windows/` | CI Linux, CI Windows, Windows local (capturas de 19/11). Capturas depois de 20 e 21/11: não verificado |

## C. Projeto Clássico com milhares de blocos

Projetos reais usados: **Reino Zero** (1.510 blocos) e **Reino Zero Ultra** (7.297 blocos),
comparados no navegador em 20/11 ([`classico-em-escala.md`](classico-em-escala.md)). O Pac-Man
citado na missão é um exemplo **Python** (2.021 blocos), medido em 08/11, antes da missão
([`../qa/2026-11-08-python-classic-performance.md`](../qa/2026-11-08-python-classic-performance.md)).
Fixtures: o dia 3 do Farol com os eventos repetidos até o tamanho pedido (`/aula?…&escala=N`, até
10.000) e a sequência única de instruções (`&forma=sequencia`).

| Item | O que foi feito | Prova | Onde foi conferido |
|---|---|---|---|
| Abrir | 10.000 blocos abrem nas três engines (Chromium 14,8 s, Firefox 33,9 s, WebKit 19,5 s). Com 5.002, de 3,8 a 6,2 s pela abertura adiada, dentro da meta de 8 s nesta máquina | `packages/studio/e2e/classic-scale.spec.ts`, `packages/studio/scripts/measure-classic-opening.mjs`; `evidencias/classico-equivalencia-2026-11-21/` | Windows local; CI Linux (run 44925989770: 11,9 s adiado e 36,1 s inteiro); emulado (5.002 blocos: 13,3 s a 4x e 19,3 s a 6x, fora da meta) |
| Navegar | Rolar 30 vezes 900 px com 5.002 blocos sem nenhuma tarefa longa (a base tinha 30, a maior de 349 ms); a cauda distante nasce sem desenho e volta ao chegar perto | [`classico-em-escala.md`](classico-em-escala.md), etapa 3; `packages/studio/e2e/offscreen-lifecycle.spec.ts` (Blockly de verdade, três engines) | Windows local; CI Linux e CI Windows (passo "Blockly demand-rendering lifecycle" do `studio-mission.yml`, 44904766980) |
| Procurar | "Procurar no programa" (a partir de 300 blocos, também com Ctrl+F) acha pelo modelo, inclusive na cauda sem desenho, e "Mostrar o bloco" leva até ele; desde `f84f54255` o resultado é a linha do próprio bloco | `packages/studio/e2e/classic-workspace-search.spec.ts` (2.000 blocos); `packages/studio/src/blockly/__tests__/workspaceSearch.test.ts` | CI Linux (`ci.yml`, shards verdes em `6d495f877` e depois). A correção `f84f54255`: não verificado em CI |
| Editar | Com 10.000 blocos a edição chega ao código. O gesto é uma tarefa de 220 a 354 ms; a meta de 50 ms vale até cerca de 2 mil blocos | `studio-classic-equivalence.yml`; `evidencias/classico-equivalencia-2026-11-21/perfil-do-gesto-10mil-*.txt` | Windows local, CI Linux; emulado (editar um campo com 5.002: 361 ms a 4x, 520 ms a 6x) |
| Arrastar pilhas | Arrastar o primeiro evento, que leva a cauda, com 5.002 blocos: maior tarefa de 334 ms (a base, 2.004 ms); mover uma área: 158 ms. Limite: nesse arrasto a pilha não encaixa por baixo em outro bloco | [`classico-em-escala.md`](classico-em-escala.md) | Windows local; emulado (mover a área com 5.002: 420 ms a 4x, 593 ms a 6x) |
| Desfazer e refazer | Funcionam num bloco que estava fora da página, junto com "Mostrar o bloco" e o cursor do código da Ponte | `offscreen-lifecycle.spec.ts`; `packages/studio/e2e/classic-offscreen.spec.ts` (`2fed26d57`) | CI Linux, CI Windows (44904766980), Windows local |
| Converter | Blocos para código: o mesmo estado salvo e o mesmo código com e sem a montagem sob demanda, depois de abrir, de editar no alto e de editar dentro da cauda. Código para blocos com a sequência única de 10 mil: o editor de blocos não abre e mostra "Não deu para abrir estes blocos", sem perder nenhum bloco. "Virar profissional" com milhares de blocos: não verificado | `.github/workflows/studio-classic-equivalence.yml`; `packages/studio/e2e/classic-long-sequence.spec.ts` | CI Linux (44944817550), Windows local |
| Salvar | O estado do Blockly sai em objetos comuns (`jsonPlainCopy`) antes de ir ao projeto, à Ponte, à nuvem e à exportação; a qualificação profunda do armazenamento roda com 10 mil blocos | `packages/studio/src/blockly/__tests__/savedWorkspaceState.test.ts`; `packages/studio/src/state/projectStorageBrowser.test.ts` com `STUDIO_STORAGE_DEEP=1` | CI Linux e CI Windows (job `contracts`, 44904766980). A gravação do autosave com 10 mil blocos não foi medida |
| Reabrir | Reino Zero e Reino Zero Ultra abrem com estado e código iguais aos da base; abrir não regrava o projeto (os 185 exemplos abrem sem mudar um byte, `021e5ff72`) | [`classico-em-escala.md`](classico-em-escala.md); [`revisao-2026-11-20.md`](revisao-2026-11-20.md) | Windows local |
| Executar | O Reino Zero Ultra roda sem voltar à tela de título no meio da partida | `packages/studio/e2e/reino-zero-ultra.spec.ts` | CI Linux (`ci.yml`, shards verdes em `f3b11d15a`). A fixture de 10 mil blocos rodando o jogo: não verificado |
| Trocar de modo | Blocos e Ponte com milhares de blocos | nenhuma | não verificado |

## D. Jogo 2D de grande porte

**Não feito.** O jogo pedido (vila, floresta, cavernas, interiores, centenas de entidades, regiões,
transições, persistência e carregamento progressivo) depende do carregamento por regiões da seção
8.3, que nenhum motor 2D tem ([`motores-inventario.md`](motores-inventario.md)). A proposta das
regiões foi aprovada em 21/11: a parte 2D é o recorte do desenho dos objetos do Pinta (`719fade30`,
com o conserto dos conjuntos em `78f854bae`), sem bloco nem carregamento por regiões; a parte 3D
está especificada em [`regioes-3d-especificacao.md`](regioes-3d-especificacao.md) e depende do
formato da frente do Molda.

O que já existe e o jogo D vai usar:

| Peça | Prova | Onde foi conferido |
|---|---|---|
| Uma cena real do Pinta como dados no Jogo 2D: "A Vila e a Floresta" roda na prévia e no site exportado, sem rede, com o tamanho, os objetos e a porta da cabana conferidos pelo próprio motor | `packages/studio/e2e/scene2d-export.flow.ts` | CI Linux, nas três engines (44904766980) |
| Mundos ligados do Pinta (portas que levam a outros lugares), com dois leitores históricos congelados | `packages/studio/playwright.pinta-world.config.ts` | CI Linux (44860362872) |
| Os tetos dos motores avisam em vez de cortar calados (400 sprites por grupo, partículas, faíscas) | `game-2d/__tests__/limitWarnings.test.ts`, `game-2d-advanced/__tests__/runtime.test.ts` | Windows local (lote 4) |
| O custo de desenhar sprites fora do palco: de 0,28 a 0,45 ms por quadro com um grupo de 400 sprites inteiro fora | `packages/studio/e2e/engine-2d-offscreen.spec.ts`; `evidencias/motores-gpu-2026-11-21/sprites-fora-do-palco-windows.json` | Windows local; CI Linux (`studio-engines.yml`, 44944417041) |

Sessões prolongadas, retorno a regiões anteriores, áudio e efeitos num mundo grande: não verificado.

## E. Jogo 3D de exploração

**Não feito.** A fixture genérica de exploração (terreno extenso, várias regiões, centenas de
objetos, personagens animados, água, luzes, física e streaming) não existe. O streaming por regiões
depende da frente do Molda: o formato `studio-cena3d` v1 não tem lista de regiões e o Estúdio
carrega a cena inteira ([`mapa-da-missao.md`](mapa-da-missao.md), seção 12). Nenhum asset privado
do Arquipélago foi usado.

O que já existe:

| Peça | Prova | Onde foi conferido |
|---|---|---|
| Os objetos de GPU dos três motores 3D (buffers, texturas, programas, framebuffers, VAOs) estáveis em 10 recomeços, com o recomeço que recria a cena conferido e prova por sabotagem | `packages/studio/e2e/engine-gpu-cycles.spec.ts`; `evidencias/motores-gpu-2026-11-21/windows-local.json` (`74c852e78`, árvore limpa) | Windows local; CI Linux (`studio-engines.yml`, 44944417041) |
| Contrato de um cenário completo do Molda (relevo, água, caminhos, grupos e conjuntos, colisões, partidas, marcadores, iluminação, materiais e regiões) pelo domínio, pelo compilador e pela importação do Estúdio | `packages/studio/src/core/scene3d/__tests__/moldaFullScenario.contract.test.ts` (15 casos) | Windows local (21/11/2026: 15 casos passam e 3 ficam como pendentes declarados, `todo`); em CI: não verificado (veio em `fa4872992`, depois da última homologação) |
| Uma cena 3D de homologação (não um cenário real) roda na prévia e no site exportado | `packages/studio/playwright.scene3d-document.config.ts` | CI Linux (44860362872) |
| A aba Desempenho dos jogos 3D mostra "Objetos na cena" e "Desenhos por quadro" | [`paineis-proposta.md`](paineis-proposta.md), lote 4 da interface | não verificado (sem rodada registrada no navegador) |

Triângulos, memória de GPU, 30 quadros por segundo em qualidade leve e a carga do cenário completo
no Three: não verificado.

## F. Projeto Pro grande

O projeto modular de 60 arquivos TypeScript que se importam em cinco camadas
(`packages/studio/e2e/fixtures/pro-workspace/modularProject.ts`), medido dentro da página em
`packages/studio/e2e/pro-workspace-performance.spec.ts` ([`pro-em-escala.md`](pro-em-escala.md)).

| Item | O que foi feito | Prova | Onde foi conferido |
|---|---|---|---|
| Muitos arquivos, JS e TS | 60 arquivos: digitar p95 32,9 ms (Linux) e 33,9 ms (Windows), abrir painel 28,9 e 30,4 ms, primeira resposta da busca 18,4 e 12,4 ms; o serviço de linguagem também com 1.000 arquivos | `evidencias/pro-modular-2026-11-20/`; `packages/studio/scripts/measure-pro-modular.ts` (`STUDIO_PRO_LANGUAGE_FILES=1000`) | CI Linux e CI Windows (homologação 44854588851 em `a674e4c16`; os 1.000 arquivos no job `contracts` de 44904766980); Windows local; emulado (digitar a 4x 47,8 ms; a 6x 55,4 ms, acima dos 50 ms) |
| Diagnósticos | Quebrar o tipo de um método da classe base acusa os arquivos fechados que dependem dela em cerca de 0,4 s; consertar tira os problemas; nenhum resultado de versão antiga aparece | `pro-workspace-performance.spec.ts`, caso "modular 60-file project" | CI Linux, CI Windows (44854588851), Windows local |
| Operações do editor | "Onde isto é usado" p95 56 ms, "Trocar nome em todo lugar" (21 arquivos) 97 ms e "Arrumar código" 87 ms, teto de 200 ms; "Organizar as importações" com teste do serviço e e2e provado por sabotagem | `evidencias/pro-operacoes-2026-11-21/windows-local.json` | Windows local. Rodada completa dos shards do CI depois de `9d8934d5a`: não confirmada |
| Dependências | Projeto novo com `npm install nanoid@5.0.9` no terminal: o `package.json` volta ao projeto, a importação funciona na prévia, `npm run build` passa e a dependência continua depois de recarregar | `packages/studio/e2e-pro-full/pro-full-preview.spec.ts` (sob demanda, `playwright.pro-full.config.ts`) | Windows local (Chrome do sistema). O build hospedado com dependências reais: não verificado |
| Materiais | A exportação leva os materiais em `public/` com o `studio-assets/manifest.json` | `packages/studio/scripts/verify-exports.ts` | CI Linux e CI Windows (44944817571). No ensaio com tudo ligado: não exercitado |
| Testes | "Meus testes" do Pro roda no executor do servidor ("Testar o jogo" e "Testar uma função"), com os testes do core, do Members, do gateway, da rota e da gaveta | [`paineis-proposta.md`](paineis-proposta.md), lote 10 da interface | não verificado no navegador nem no staging |
| Build | O mesmo ZIP instala com `npm ci` e constrói duas vezes igual; o mesmo build, byte a byte, no Linux e no Windows, para os 15 projetos | `verify-exports.ts`; [`exportacao.md`](exportacao.md); `evidencias/exportacao-2026-11-21/windows-local.json` | CI Linux e CI Windows (44944817571), Windows local |
| Histórico | O Histórico do projeto guarda a versão antes de uma operação, compara com agora e volta | `packages/studio/src/state/__tests__/proProjectHistory.cases.ts`; `packages/studio/e2e/pro-workspace.spec.ts` ("the project history keeps the version before an operation…") | CI Linux (homologação 44949817617, `d2f238b62`, shard 3 do Chromium); Windows local. Desde o full review final, também a janela sem versões e a linha "Antes de voltar para a versão de…" (`0fe5d470e`, Windows local) |
| Execução | As três execuções: leve (montada no navegador, sem o compilador do servidor), hospedada (o Vite no contêiner) e completa (WebContainer) | `packages/studio/e2e/pro-light-runtime.spec.ts` (Chromium, Firefox e WebKit); job `hosted-runtime` ("Real build and validation in the sandbox without network"); `pro-full-preview.spec.ts` | Leve: CI Linux (`ci.yml` e homologação). Hospedada: CI Linux (44904766980). Completa: Windows local. O mesmo projeto pelo compilador de staging, lado a lado: não verificado ([`pro-execucao.md`](pro-execucao.md)) |
| Exportação | 15 de 15 projetos exportados, instalados e construídos fora do Estúdio | `.github/workflows/studio-export.yml` | CI Linux, CI Windows, Windows local |
| Editor, linguagem, prévia, console e Zappy juntos | Ensaio com a análise dos 61 arquivos, o jogo rodando, uma pergunta ao Zappy em voo (um adaptador de teste que responde em 1,5 s, não o Zappy de verdade), painéis, busca, um arquivo criado e renomeado com o jogo rodando e 10 ciclos de Parar e Rodar: digitar p95 32,0 ms (Linux) e 31,2 ms (Windows), quadros do jogo p95 16,7 e 16,8 ms, memória do editor +1,5% | `pro-workspace-performance.spec.ts`, caso "tudo ligado ao mesmo tempo"; `evidencias/pro-ensaio-2026-11-21/` | CI Linux e CI Windows (homologação de `1dd1f51c6`), Windows local. O console não aparece na lista do ensaio: não confirmado |

## G. Python

Runtimes oferecidos: Python sem biblioteca de jogo, Turtle, Pygame Zero, pygame-ce e Raylib (2D e
3D) ([`capacidades-dos-runtimes.md`](capacidades-dos-runtimes.md)).

| Item | O que foi feito | Prova | Onde foi conferido |
|---|---|---|---|
| Testes representativos no navegador | Supervisor, provedor, isolamento do host, Python clássico, jogos (o Pac-Man original chega à cena real; o Space Arena acusa a incompatibilidade de `randint` com float no CPython 3.14), mundos e física do Pinta, no Worker de verdade | `packages/studio/playwright.mission-python.config.ts` (job `python-browser-isolation`) | CI Linux (44860362872 e 44904766980) |
| Execução no contêiner | Missão e playtest Python e os objetivos do Three no contêiner isolado, sem rede | `packages/studio-runtime/tests/python-mission-smoke.ts`, `python-playtest-smoke.ts --docker`, `three-objectives-smoke.ts` (jobs `hosted-runtime` e `studio-runtime-image.yml`) | CI Linux |
| pygame-ce | Todos os jogos pygame-ce em blocos com o Python do runtime; a ponte e os materiais do Pinta com o pygame-ce 2.5.7 nativo | `packages/studio/scripts/python/pygame-block-coverage.ts --check`, `packages/studio/scripts/python/test-pinta-module.py` (job `studio-python-extensions` do `ci.yml` e job `contracts` da homologação) | CI Linux |
| Raylib | Existe a configuração `packages/studio/playwright.python-raylib.config.ts` | nenhuma rodada nesta missão | não verificado |
| Painéis no Python | Projeto novo com Pygame Zero, na distribuição nova: Desempenho com 59 quadros por segundo e 17 ms por quadro; "Pausar" ("O jogo está pausado, Quadro 355"); "Avançar 1 quadro" anda exatamente um (Quadro 356, `pos` de 308 para 310); "Investigar" com "Valores agora" e "Mostrar o bloco" | [`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md) | staging logado (21/11) |
| Custo do interpretador, do transporte dos quadros, da renderização e do editor, medidos à parte | Não feito nesta missão. A medição de 08/11 (antes da missão, local, Pac-Man Python) mede o editor (tarefas longas somadas de 1.393 para 106 ms), o intervalo de desenho da prévia (p95 de 33,1 para 26,0 ms) e o `Audio.play()` (de 7,6 para 0,2 ms), mas não separa interpretador e transporte. Os portões de `packages/studio/e2e-runtime/PERFORMANCE.md` (F1, F3 e Space Arena) não rodaram nesta missão | [`../qa/2026-11-08-python-classic-performance.md`](../qa/2026-11-08-python-classic-performance.md) | não verificado |

## H. Falhas intencionais

Os programas hostis moram num só lugar, `packages/studio/e2e/helpers/hostilePrograms.ts`, e rodam
em `preview-hostile-programs.spec.ts` (prévia direta, Chromium) e `preview-shell-hostile.spec.ts`
(prévia na casca, Chromium e Firefox). Desde o lote 2, "o editor sobrevive" inclui salvar com o
programa hostil rodando: o "Salvar" do menu ⋯ responde e o selo volta a "Salvo" depois que o banco
confirma. O WebKit fica fora, por decisão registrada (B4, [`isolamento-da-previa.md`](isolamento-da-previa.md)).
Os cinco programas que existiam antes do lote 2 (trabalho síncrono longo, recursão sem fim,
enxurrada de mensagens, execução interrompida e memória crescendo) são os que rodaram no CI Windows
e no emulado.

| Falha | O que se confere | Prova | Onde foi conferido |
|---|---|---|---|
| Laço infinito | A guarda corta em cerca de 4 s e as "Mensagens do jogo" dizem "laço interrompido"; o editor responde e salva | `preview-hostile-programs.spec.ts`, `preview-shell-hostile.spec.ts` | Windows local (10 de 10 na prévia direta, 9 de 9 na casca no Chromium e no Firefox); CI Linux (`ci.yml`: Chromium em `f3b11d15a`, Firefox em `ee82d0dfd`) |
| Recursão sem fim | Vira erro do jogo ("Opa, a página parou"), não do editor | os mesmos | Windows local, CI Linux, CI Windows (44904766980), emulado (4x e 6x) |
| Excesso de mensagens | A enxurrada no console e a de eventos (500 ouvintes, 2.000 teclas falsas e 2.000 mensagens forjadas por volta) não travam o editor | os mesmos | Windows local, CI Linux; a enxurrada de mensagens também em CI Windows e emulado |
| Material inválido | Cena do Pinta (v1, v2 e v3) ou do Molda com campo ou versão desconhecida recusa o projeto inteiro, sem regravar nada; a varredura dos desenhos não apaga a cena que a versão não lê | `packages/studio/src/testing/contracts/contracts.test.ts` (fixtures congeladas, `1136c01a1`); `b380d05a8`; linha 8 de [`persistencia-matriz.md`](persistencia-matriz.md) | CI Linux e CI Windows (suíte isolada do job `contracts`, 44904766980). Imagem ou som corrompido num jogo rodando: não verificado |
| Dependência ausente | No Pro, sem a pasta `node_modules` (instalação ainda não terminada) o índice das bibliotecas sai vazio e sem erro; outro erro do sistema de arquivos vira frase para a criança, sem o "ENOENT" cru | `packages/studio/src/modes/pro/dependencyDeclarations.test.ts` (`74c852e78`) | Windows local (registro do lote 6). Importar uma biblioteca que não está instalada: não verificado |
| Falha de carregamento | A casca sem resposta em 4 s volta ao documento direto e avisa; um documento novo que não carrega em 3 s ganha um iframe novo; uma carga de blocos que falha mostra "Não deu para abrir estes blocos" e trava a gravação dos blocos até uma carga dar certo | `PreviewIframe.test.tsx` (`2494eb0db`); `classic-long-sequence.spec.ts` | CI Linux (`ci.yml`, shards verdes em `6d495f877` e depois), Windows local |
| Projeto acima do orçamento | Arquivo grande demais é recusado com "Este arquivo é grande demais para importar. Nada mudou na sua lista."; no Pro, a mudança que passaria das cotas do compilador é recusada e o projeto que não cabe na execução leve vai ao servidor; os tetos dos motores avisam | `ProjectTooLargeError` (`packages/studio/src/core/projectDocumentGuards.ts`); `packages/studio/src/modes/pro/lightProBuild.test.ts` (as cotas); `limitWarnings.test.ts` | CI Linux e CI Windows (suíte isolada, 44904766980) para o Pro; Windows local para os avisos dos motores. Prova no navegador: não verificado |
| Fechamento inesperado | Recarregar logo depois de uma mudança, com a CPU 6x mais lenta e com uma transação de saída abortada, traz a mudança; a marca de execução interrompida faz a prévia esperar o Rodar | `reload-flush.spec.ts` (Chromium e WebKit), `src/state/projectStorageBrowser.test.ts` (12 recargas com escrita em voo; `STUDIO_STORAGE_EXIT_FAULT=abort`), `run-save-revision.spec.ts`, o caso "depois de uma execução interrompida" | CI Linux e CI Windows (job `contracts` e `browsers`, 44904766980), staging logado (recarregar 50 ms depois de Rodar, 20/11), emulado (a execução interrompida a 4x e 6x) |
| Conflito de salvamento | A segunda aba recebe `ProjectWriteConflict` e a primeira gravação vence; um cliente v3 depois da migração não apaga o v4; a gravação pendente vai para o perfil em que nasceu | `projectStorageBrowser.test.ts` (fase de duas abas), `packages/studio/e2e/storage-downgrade.flow.ts`; [`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md) | CI Linux e CI Windows (job `contracts`), staging logado (troca de perfil, 21/11). Lacuna: a cópia "(edição recuperada)" da aba que perde só está provada com IndexedDB falso |
| Código com erro de compilação | É erro do jogo, com o lugar ("Opa, a página parou"), e o conserto roda | `preview-hostile-programs.spec.ts`, caso "erro de compilação" | Windows local, CI Linux (`ci.yml`, shards verdes em `f3b11d15a`) |

O editor continua seguro e os dados preservados em todos os casos acima com prova no navegador. As
lacunas de persistência que sobram estão em [`persistencia-matriz.md`](persistencia-matriz.md)
(duas abas no mesmo projeto, a janela de 120 ms dos blocos, o terminal do Pro na saída, a cota no
WebKit, o envio da aula, a migração interrompida de verdade, a troca de perfil no app e a subida em
voo).

## O que falta para fechar a seção 17

1. Uma homologação integral com os consertos do full review final (a de `d2f238b62` teve 11 de 12
   verdes; a falha foi um teste consertado em `b182d1313`).
2. Feito no lote 8: as capturas de depois das mudanças de 20 e 21/11 nas 13 partes
   (`evidencias/a3-depois-2026-11-21-ci/`).
3. Feito no lote 8: Verificar e Enviar com a casca ligada, Cadê adulto (2 de 2 e enviado) e Desafio
   no Kids (enviado; os 6 de 6 da parte 4 com a casca ficaram sem conferir).
4. Os jogos D e E inteiros, que dependem das regiões e do streaming (proposta, e no 3D a entrega da
   frente do Molda).
5. No C: trocar de modo, executar e "Virar profissional" com milhares de blocos.
6. No F: o build hospedado com dependências reais e Meus testes do Pro no navegador (o Histórico
   do projeto já passou no CI, na homologação de `d2f238b62`).
7. No G: o Raylib, e o custo do interpretador, do transporte dos quadros, da renderização e do
   editor medidos à parte.
8. No H: material corrompido num jogo rodando, importação de biblioteca ausente e projeto acima do
   orçamento no navegador.
