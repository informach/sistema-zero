# Revisão da evolução do Estúdio — 18/11/2026

## Parecer

**A missão completa não foi entregue.** Há avanços funcionais e cobertura relevante dos cursos,
mas nenhum conjunto de testes apresentado qualifica todas as etapas 0–10. Não aprovar como
conclusão global, nem confundir a integração dos commits com homologação do produto inteiro.

Revisão do estado integrado `37f4d4e3aa82244688438bbec04034fb9fbd6f63`, comparado com
`bf6e895fc` (início registrado da missão). O inventário com hashes dos 94 caminhos alterados em
Studio/src, studio-runtime e core/studio está em
[scope.json](studio-full-review-20261118/scope.json). Esse inventário inclui testes e gerados;
não significa que cada linha de todo o monorepo tenha recebido auditoria formal.

O remoto foi integrado à staging local por fast-forward de `b9486ebb9` a `37f4d4e3a`.
As alterações concorrentes do Molda foram preservadas. A revisão e seus artefatos ficam na
branch/worktree `estudio-full-review-20261118`, separada. Nenhuma mudança de produção, banco,
asset privado ou implantação foi feita por esta revisão.

Durante a revisão, a outra frente concluiu o commit `42b395d93` de Molda Cenários. Na conferência
final, staging local e origin/staging estavam nesse mesmo commit, sem alterações pendentes na
árvore compartilhada. O diff `37f4d4e3a..42b395d93` não altera Studio, studio-runtime, core/studio
nem member-shell; portanto não invalida a referência do código do Estúdio testado aqui.

## Achados que impedem o aceite global

### R1 — Alta: isolamento depende do navegador e do arranjo de origem

Fonte: `packages/studio/src/components/preview/PreviewIframe.tsx` (iframe srcdoc, sandbox e
`FRAME_GAPS_MS`); `packages/studio/e2e/preview-hostile-programs.spec.ts:84` restringe todos os
casos a Chromium; `packages/studio/playwright.config.ts` também não seleciona esses casos nos
projetos Firefox/WebKit.

Reprodução nova com `node scripts/measure-preview-isolation.mjs --json`, no Windows, três motores:

| Motor | srcdoc sem/com cabeçalhos: maior intervalo do relógio | Clique durante bloqueio |
|---|---|---|
| Chromium 148 completo | 64 / 63 ms | 26 / 25 ms |
| Firefox 150 | 4.999 / 5.004 ms | 4.551 / 4.628 ms |
| WebKit 26.4 | 5.034 / 5.028 ms | 4.546 / 4.536 ms |

O controle de mesma origem bloqueou nos três. Outro site com os cabeçalhos isolou no Firefox
nesta rodada (56/59 ms), mas não no WebKit (5.063/4.575 ms). Valores completos, controles e versões:
[isolation-windows.json](studio-full-review-20261118/isolation-windows.json).

É um experimento mínimo que reproduz o arranjo do iframe, **não E2E completo do Estúdio nos três
motores**. Demonstra que sandbox/origem/watchdog/intervalo sem iframe não são prova universal de
interrupção. O intervalo de 200/1.200/3.500 ms é recuperação heurística dependente de descarte de
processo; a própria implementação reconhece que esse tempo não tem contrato do navegador.

No Chromium, o E2E real de trabalho síncrono nativo, Parar e execução corrigida passou nesta
revisão — a falha anterior do Windows não se reproduziu. Falta fechar a estratégia por executor
e navegador, inclusive jogos DOM, Canvas, GPU e memória; medir e testar a capacidade declarada.

### R2 — Alta: Clássico grande ainda não atende as metas e a matriz de operações

Fonte: `src/blockly/offscreenBodies.ts`, `e2e/classic-offscreen.spec.ts` e
`docs/estudio-evolucao/classico-em-escala.md`.

A nova montagem remove corpos de eventos/funções distantes e conserva o modelo Blockly. No teste
real com cerca de 2.000 blocos, rolar preservou código/estado, editar alterou o código e desfazer
fora da vista restaurou o original. Projetos das aulas não ativaram o mecanismo.

Entretanto a carga inicial ainda monta o workspace completo. Pilhas simples extensas mantêm
seus nós no DOM, só escondendo a pintura. O relatório remoto registra 14,7 s para abrir 5.002
blocos (meta 8 s), tarefa de movimentação de 938 ms (meta 500 ms) e 58,7 s para 10.000 blocos.
Esses números são históricos Linux; não foram reclassificados como medição Windows.

O novo E2E cobre 2.000, não 10.000; não fecha buscar/revelar, arrastar pilhas extensas,
refazer, salvar/reabrir, executar e trocar modo na fixture máxima. Portanto a etapa 2 continua
parcial mesmo com ganho real. Próximo trabalho é carga/desenho incremental e prova de integridade,
não aumento de timeouts ou conversão de blocos editáveis em código opaco.

### R3 — Alta: a revisão executada pode ser diferente da revisão confirmada no salvar

Fonte: `src/components/preview/prepareRun.ts:42–60` e
`src/components/preview/prepareRun.test.ts` (casos de gravação lenta/falha e edição durante espera).

Rodar espera até 1.500 ms pela gravação, ignora sua rejeição e roda a versão corrente após outro
flush. Mesmo quando a gravação confirma, uma edição feita durante a espera entra no jogo sem
uma nova confirmação de persistência. Os testes exigem explicitamente `isDirty=true` nesses
casos. Isso pode ser uma política de produto válida para executar offline, mas **não satisfaz a
condição de aceite escrita: recarregar logo após Rodar sempre traz o último código executado**.

Não foi demonstrada perda efetiva de dados nesta revisão: há stage local, autosave e flush de
saída independentes que podem recuperá-los. O achado é a ausência da garantia exigida e do ensaio
de interrupção nessa janela, não alegação de perda inevitável. É necessário testar a revisão
exata em reload/queda, erro de quota e adaptador externo lento, e decidir/documentar o contrato
de recuperação; não marcar essa condição concluída apenas porque Rodar não fica bloqueado.

### R4 — Alta: depuração, profiling e testes de autoria ainda não constituem as entregas pedidas

Fontes: `src/modes/pro/workspace/model.ts`, `ProDock.tsx`, contratos de linguagem em
`src/monaco/pro/`, `src/runtime/python/workerSupervisor.ts` e pendências do plano executado.

O workspace possui arquivos, busca, materiais, guias, problemas, console, terminal e REPL Python.
Diagnóstico com arquivo/linha, source maps, observação de missão e REPL são recursos úteis, mas
não equivalem a breakpoints/passo/pilha/inspeção de variáveis. As abas declaradas não incluem uma
experiência de depuração, profiler ou autoria/execução de testes do aluno conforme etapas 5–7.

Contadores internos de render/qualidade também não equivalem ao profiler opt-in, comparação de
sessões, custo da instrumentação e recomendações infantis derivadas de medições. Verificadores
de curso não substituem testes comportamentais editáveis independentes da solução da aula.

### R5 — Alta: falta homologação integral nos fluxos e aparelhos exigidos

As aulas são montadas no playground com Blockly real e objetivos executáveis; isso é evidência
forte de montagem, mas não fecha Verificar/Enviar/Concluir autenticados no host real. Faltam
sessões prolongadas dos jogos D/E, Pro com dependências reais, WebContainer, builds hospedados,
Zappy real, publicações de homologação, memória/GPU após repetição e dispositivos físicos de 8 GB.
Nenhuma credencial de produção foi usada para tentar preencher essas lacunas.

### R6 — Média: documentos e interpretação de benchmark precisam ser atualizados

`docs/estudio-evolucao/README.md` afirma que nada foi mesclado à staging, o que já não corresponde
ao histórico. `linha-de-base-linux.md` chama o tempo de abertura de "abrir um arquivo", mas
`e2e/pro-workspace-performance.spec.ts:95–102` executa `page.goto(url)` em cada amostra: mede
abertura da página até o textarea, não troca de arquivo numa sessão existente.

A digitação medida vai de keydown ao segundo requestAnimationFrame. O JSON corretamente a
declara proxy, não latência exata de pixels ou INP. Manter essa distinção também nos resumos.
A nova rodada produziu p95 de 704,6 ms para abertura da página, 32,4 ms para esse proxy e
133,4 ms para ida/volta de layout; serviços são controlados. Houve outras verificações em paralelo
na máquina: estes valores são observação de laboratório, não comparação limpa antes/depois.

## Cobertura de todas as etapas

Legenda: **parcial** = existe implementação relevante, mas falta requisito ou prova de aceite;
**pendente** = a entrega exigida não está integrada/homologada como capacidade do produto.

| Etapa | Estado real | Presente | O que falta para aceite |
|---|---|---|---|
| 0 Baseline | Parcial | Inventário, matriz dos cursos, ensaios JS/Blockly e Pro, PDFs e evidências históricas | Dez runtimes medidos, objetivos no host real, aparelhos, CPU/memória/GPU e metas definitivas por fixture |
| 1 Isolamento | Parcial | Sandbox/CSP, autenticação por Window source, limite de mensagens, tripwire, parada/remontagem; Python em worker; E2E Chromium | Garantia nos demais navegadores e executores, trabalho nativo/GPU/memória; durabilidade da revisão executada |
| 2 Clássico | Parcial | Índice de tipos na geração, menos alocações em referências, montagem de corpos fora da vista, proteção dos cursos | Carga incremental, invalidação semântica/local, salvar incremental, todos os gestos com 10 mil e metas de 5 mil |
| 3 Pro | Parcial | Monaco/serviços em worker, FS ordenado/reconciliação, diagnóstico, busca, revisão de operações, terminal e runtime remoto existentes | Perfil leve real de JS/Canvas: ProPreview escolhe remoto ou WebContainer; medir dependências reais, memória e troca de perfil; fechar limites e IDE completa |
| 4 Motores | Parcial | Motores existentes, pools/índices e orçamento Three; consumo estruturado Pinta 2D | Streaming genérico com orçamento, prefetch/descarte/estado seguro; homologação extensa 2D/3D e memória/GPU |
| 5 Depuração | Pendente | Erros/localização e REPL existentes | Contratos por runtime e depurador funcional de blocos/código/Python com testes |
| 6 Profiler | Pendente | Sondas internas de orçamento e benchmarks de desenvolvimento | Produto opt-in com métricas, gráficos, custo medido e recomendações verificáveis |
| 7 Testes do aluno | Pendente | Infraestrutura de objetivos e ferramentas externas acessíveis via terminal | Autoria e execução isolada de testes selecionados, limites, relatórios e verificação antes de exportar |
| 8 Pinta/Molda | Parcial | PintaScene v1: camadas, tilesets, objetos, propriedades, animações, colisões, grupos, marcadores/region, export e consumo nos dois motores 2D | Região declarada não é streaming; consumo integral Molda 3D e integração real das capacidades em desenvolvimento, referências de versão e falhas |
| 9 Persistência | Parcial | Coordenador de revisão, serialização por banco/projeto, journal/recuperação, conflitos; flush de saída testado | Fechar todas as interrupções, perfis/dispositivos/cliente antigo e revisão rodada; validar conversão/rastreabilidade em cenário real |
| 10 Fluxo profissional | Parcial | Fontes/ZIP, builds remoto/local, locks/config, histórico e revisão já existentes | Reprodutibilidade ponta a ponta, publicar/recuperar versão em homologação, manuais consolidados e integração dos testes/profiler/depurador |

O Pro não recebeu modernização integral nova nessa série: várias ferramentas já existiam antes
de `bf6e895fc`. Isso não reduz seu valor, mas não permite atribuir à missão o que já era baseline.
Não há proposta de reescrever motores nem abandonar os executores maduros. O limite remoto
continua 80 fontes (`packages/core/src/studio/pro-limits.ts`); quantidade editável, compilável e
publicável deve continuar explícita, sem aumento indiscriminado.

## Runtimes: capacidades e limites da verificação

| Runtime | Arquitetura/fonte | Capacidade existente e lacuna da missão |
|---|---|---|
| Jogo 2D | official-extensions/game-2d | Canvas, sprites/colisão/mapas, Pinta estruturado; curso montado no navegador; sem prova de streaming/extenso prolongado |
| Jogo 2D Avançado | official-extensions/game-2d-advanced | Motor separado e adaptador Pinta; testes executam colisão dos dois motores; não é aceite de jogo D |
| Jogo 3D | official-extensions/game-3d | Three e orçamento compartilhado; falta nova medição GPU e mundo extenso |
| Mundo 3D | official-extensions/world-3d | Three e orçamento compartilhado; falta streaming com preservação de estado |
| Jogo 3D Avançado | official-extensions/game-3d-advanced | Three/recursos avançados; falta homologação E e descarte prolongado |
| Python Clássico | runtime/python/workerSupervisor.ts | Worker interrompível e protocolo validado; não é prova de debugger e desempenho de todos os renderers |
| Pygame-ce | runtime/python/pygame | Interpretador isolado + transporte/renderer; não foi feita nova sessão gráfica longa nesta revisão |
| Pygame Zero | runtime/python/pgzero | Renderer/áudio e protocolo; falta decompor custo do interpretador, transporte e editor |
| Turtle | runtime/python/turtle | Renderer próprio; falta baseline gráfica longa/depuração |
| Raylib | runtime/python/raylib | Renderer próprio e integração Python; falta homologação física/profiler e sessão longa |

## Compatibilidade, identidade e segurança

A matriz pedagógica versionada cobre tipos, opções, paletas e gestos. Os testes de navegador
reproduzem as cinco aulas, não apenas procuram nomes no código. Referências não foram regravadas.
Os PDFs e capturas de antes/depois já registrados continuam disponíveis; vídeos gravados não
foram acessados nesta revisão. Não presumir equivalência exata com vídeos não inspecionados.

O diff de estilo do Estúdio nesta série acrescenta a regra de ocultação de corpos distantes;
não troca fonte/paleta/tokens. A mídia local do Blockly restaura assets da versão instalada.
Não houve redesign nesta revisão. Isso não substitui inspeção de cada host/resolução.

O iframe continua sem allow-same-origin, com checagem de source/origin e limitação de mensagens;
o supervisor Python invalida autoridade antes de terminar o worker. Esses controles foram
preservados. Isolamento de dados e isolamento de processamento são critérios diferentes.

O ensaio adicional de perfil provou que editar o projeto carregado do perfil A após mudar para B
não copia os dados para B: a revisão de armazenamento recusa a escrita, mantém o buffer sujo e
preserva o conteúdo. Não classificar como vazamento. A mensagem fala em "outra aba", embora o
gatilho seja perfil: uma orientação específica de exportar/voltar ao perfil original ajudaria.
Reprodutor: `packages/studio/src/state/studioStores.profile-review.test.tsx`; comando no relatório
de verificações.

## Homologação A–H e entregáveis

| Caso | Resultado de cobertura |
|---|---|
| A Cadê / B Farol | Cinco aulas aprovadas novamente: 399 gestos, 13 partes, 66 objetivos (17 de execução); envio/conclusão reais e vídeos ainda não homologados |
| C Clássico grande | E2E novo de 2 mil e medições históricas de 10 mil; falta ciclo completo na fixture máxima |
| D 2D extenso | Integração Pinta e testes de motor existem; jogo completo com todas as regiões/áudio/estado e sessão prolongada não homologado |
| E 3D exploração | Motores existem; fixture completa e medições GPU/streaming não homologadas |
| F Pro grande | Fixture de IDE/ZIP e serviços controlados; dependências/build/execução/Zappy reais simultâneos não homologados |
| G Python | Testes automatizados existentes; nova decomposição de desempenho gráfica por runtime não executada |
| H Falhas | Chromium cobre cálculo nativo, recursão, mensagens, marca de interrupção e memória; matriz completa de navegadores/falhas ainda parcial |

Diagnóstico, plano, implementação parcial, matriz e evidências de cursos estão presentes.
Relatórios integrais antes/depois, memória prolongada, homologação de jogos grandes, revisão
de segurança de todos os executores, manuais consolidados Clássico/Pro, guia do profiler e
depurador ainda precisam ser entregues. A documentação existente de exportação e capacidades
não certifica todas as condições novas. O PR histórico #271 é parcial; não equivale a PR de
conclusão global. Git completo não foi prometido pelo histórico interno.

Zappy já recebe diagnósticos e contexto com revisão/hashes e possui revisão de alterações.
Sem depurador/profiler integrados, assistência sobre variáveis, pilha e métricas reais continua
dependente dessas entregas. Não há evidência nova de execução simultânea real com IA paga.

### Conferência dos 17 entregáveis finais solicitados

| Nº | Entregável | Situação |
|---|---|---|
| 1 | Diagnóstico inicial | Documentado; baseline completa dos dez runtimes ainda parcial |
| 2 | Plano executado com todas as etapas | Plano existe; esta revisão registra o status real; etapas não estão todas executadas |
| 3 | Implementação funcional | Incrementos funcionais comprovados; escopo global incompleto |
| 4 | Matriz dos dois cursos | Presente, versionada e revalidada (43 testes estáticos) |
| 5 | Evidências dos percursos | Novas 13 capturas e 66 objetivos; falta host autenticado completo e vídeos acessíveis |
| 6 | Desempenho antes/depois | Ensaios parciais por ambiente; sem comparação global reproduzida para todos os subsistemas |
| 7 | Jogos grandes em execução | Não homologado o conjunto completo D/E/F; Clássico 2 mil exercitado nesta revisão |
| 8 | Consumo de memória | Ensaio histórico WebContainer existe; falta campanha nova prolongada e GPU por runtime |
| 9 | Segurança/isolamento | Controles existentes revisados e ensaios novos; R1 impede aprovação universal |
| 10 | Salvamento/recuperação/compatibilidade | Testes existentes passaram; novo caso de perfil preserva dados; falta fechar R3 e toda matriz de falhas |
| 11 | Manual Clássico atualizado | Documentação parcial; não consolida todas as novas capacidades exigidas |
| 12 | Manual Pro atualizado | Documentação parcial; não consolida todas as novas capacidades exigidas |
| 13 | Capacidades dos runtimes | Inventário resumido nesta revisão; falta matriz completa recurso/executor com medição e evidência de uso |
| 14 | Guia de profiling/depuração | Pendente junto das ferramentas funcionais |
| 15 | Documentação de exportação | Existe documentação/código anteriores; falta fechar reprodutibilidade da evolução inteira |
| 16 | Concluído versus pendente | Explicitado nesta revisão, sem declarar conclusão global |
| 17 | PR com commits verificados | PR #271 cobre incremento anterior; não existe entrega global homologada para aprovação final |

## Sequência recomendada

1. Fechar inventário/baseline e envio/conclusão dos cursos em homologação.
2. Resolver R1 por runtime/navegador e fechar durabilidade da revisão de R3.
3. Concluir carga incremental e matriz completa de 5/10 mil blocos (R2).
4. Pro: perfil leve, FS/perfis/limites e dependências reais; manter identidade visual.
5. Motores/streaming e adaptadores Pinta/Molda sem alterar frentes concorrentes.
6. Depurador, profiler, testes de autoria; depois recuperação/builds/manuais e homologação A–H.

Cada etapa só fecha com teste de navegador, segurança/descarte, compatibilidade e medição.
Os resultados de execução desta revisão estão em
[verification.md](studio-full-review-20261118/verification.md).
