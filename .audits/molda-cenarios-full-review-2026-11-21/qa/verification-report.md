# Verificação da revisão

## Cobertura

| Camada | Revisão e prova |
| --- | --- |
| Documento/comandos v2 | Validação, orçamento, famílias, arquivos referenciados e inversos; 409 testes do core |
| Motor | Recursos, importação, descarte, materiais, compilador e junção; 293 testes |
| Oficina | HTTP, cancelamento, salvamento, revisão concorrente, histórico, clipboard e publicação; 159 testes |
| Agente | Autenticação, mesmas portas da oficina, importação/exportação e arquivos sem sobrescrita; 18 testes |
| Members | Acesso por conta/perfil/equipe, faixas, histórico, licenças, reservas e publicação; 99 testes de unidade/integração |
| BFF | Sessão, suporte somente leitura, x-sz-viewer, MIME/hash/stream e conteúdo de outro espaço; 55 testes |
| PostgreSQL 18 descartável | CAS, concorrência, referências, cota, histórico, cascatas e versões publicadas; 55 testes |
| Estúdio | Cenário completo produzido/importado pelos caminhos reais e contratos congelados; 120 testes, 3 TODOs preexistentes |
| Navegador | Abertura, histórico, importação, terreno, formas/espelho, água, jogo/luz, GLB, junção, prévia e exportação |

Não se afirma leitura linha a linha de todos os 343 fontes dos quatro pacotes. A inspeção foi
guiada por fronteiras e riscos, com leitura dos caminhos de produção e execução dos contratos.

## Evidências anteriores à interrupção dos testes locais

Todos os horários abaixo são UTC em 21/11/2026. Logs completos em `.cache/molda-review/` no
worktree da revisão. `exit=0` significa processo concluído e saída inspecionada.

| Afirmação | Comando/escopo | Encerramento UTC | Resultado |
| --- | --- | --- | --- |
| Fila HTTP e cancelamento | `bun test tests/host-http.test.ts` em molda-cenarios | 19:36:36 | exit=0; 17 pass; duas regressões falharam antes |
| Link com mundo divergente recusado | `node .../verificar-abertura.mjs` | 19:39:10 | exit=0; sem canvas e sem pageerror; falhava antes |
| Preflight preserva barreiras | `bun test scripts/ci` | 19:46:42 | exit=0; 338 pass |
| Tipos do Estúdio | `node node_modules/typescript/bin/tsc --noEmit` em studio | 19:41:53 | exit=0; log sem erros |
| Oficina | `bun test` em molda-cenarios | 19:46:23 | exit=0; 159 pass; types também exit=0 |
| Motor | `bun test` em molda-cenarios-motor | 19:52:04 | exit=0; 293 pass |
| Persistência real | `bun test tests/db/cenarios.repository.test.ts` | 19:43:52 | exit=0; 43 pass |
| Publicação real | `bun test tests/db/cenarios-publicacoes.test.ts` | 19:45:44 | exit=0; 12 pass; NOTICES de cascatas esperadas |
| Contratos e runtime do Estúdio | `bun test src/core/scene3d src/testing/contracts/contracts.test.ts src/official-extensions/game-3d-advanced/__tests__/runtime.test.ts src/modes/pro/workspace/ProCodeTools.test.tsx` | 19:43:27 | exit=0; 120 pass, 3 TODOs existentes |
| Integração real no browser | `playwright test --config playwright.scene3d-document.config.ts` | 19:42:59 | exit=0; 2 pass, prévia e exportação com descarte em 3 ciclos |
| Junção repetível | `CENARIOS_QA_JUNCAO=1 node .../verificar-compilacao-integrada.mjs` | 19:51:24 | exit=0; antes reordenava nos; Khronos sem erros/avisos, GPU voltou à base |
| Build que falhava no GitHub | `bun run build` em community-kids | 19:51:58 | exit=0; compilação, TypeScript e geração das rotas concluídos |
| Lint global | `bunx --no-install biome check .` | rodada local anterior à interrupção | exit=0; 17.160 arquivos, 307 warnings e 238 infos preexistentes; nenhum erro |

Histórico, restauração, formas, água e jogo/luz foram exercitados nos dois temas e em larguras
estreitas pelos scripts existentes. O ensaio de importação incluiu GLTF com recursos locais,
FBX, ZIP com OBJ/MTL/PNG, dependência ausente, endereço externo recusado e cancelamento.

## Limites e validação remota

- O CLI `agent-browser` não estava disponível. A prova de interface veio dos ensaios Playwright
  já existentes do projeto, incluindo o novo caso de abertura; não houve QA manual por esse CLI.
- Ensaios com acervo privado inicialmente falharam por arquivos ausentes num checkout novo.
  A preparação só cataloga peças depois de materializar e conferir os bytes. A ponte reaplica
  seu acabamento aprovado; a Morada lê exclusivamente o binário preparado pelo exportador
  aprovado. Ausência vira dependência explícita, sem modelo fantasma. Uma regressão com um
  repositório Git mínimo real prova esse comportamento no GitHub, sem acervo privado nem GPU.
  A revalidação completa do acervo privado ficou pendente após a interrupção local solicitada.
- Os 3 TODOs do contrato completo já existiam: streaming genérico e duas limitações do DOM
  simulado. A prova real de imagem e descarte é de navegador; não foram criados novos skips.
- CI 44940467474 falhou no build Kids com TS2322; 44941673601 repetiu a falha e ainda executava
  outros jobs durante a revisão. A aprovação final é a execução integrada posterior, não esses
  runs antigos nem os testes locais acima.
- A alteração do preflight permite somente identificar um baseline anterior de staging enviado
  pela CLI. Produção, leitura do bootstrap remoto e novos deployments seguem exigindo SHA,
  contexto, identidade, retirada das versões antigas e confirmação canônica.

## Critério de conclusão

A primeira rodada integrada (`44943713383`) comprovou o preflight SSH remoto, mas revelou dois
contratos de workflow ainda não atualizados para o novo job e o FFmpeg de outro Playwright.
O job agora prepara as fontes Ubuntu pelo helper existente e instala Chrome/FFmpeg pela CLI
do próprio `molda-cenarios` (1.60.0), em vez da CLI do Estúdio (1.65.1). Os contratos do CI
incluem explicitamente o novo job e seu orçamento de 25 minutos, sem alterar os outros limites.

O ciclo `44946156167` chegou ao lint global e apontou uma formatação no novo teste do instalador
de browser. O arquivo foi formatado; o lint direcionado dos 95 arquivos alterados passou em
286 ms, e os 12 contratos leves correspondentes passaram. As provas pesadas seguem no GitHub.

O mesmo ciclo passou pelos sete primeiros scripts de browser do Molda e perdeu o contexto
na importação dinâmica do compilador integrado. As entradas do scanner do Vite agora incluem
compilador e colisões usados por URLs calculadas, conforme a documentação de
[`optimizeDeps.entries`](https://github.com/vitejs/vite/blob/main/docs/config/dep-optimization-options.md).
A confirmação dessa hipótese fica com a próxima rodada remota. O artefato passa a incluir
o log oculto do servidor e o ensaio registra mensagens do Vite para permitir diagnóstico.

O ciclo `44947262460` apontou o fingerprint anterior à alteração recente do Pinta
(`719fade30`). O gerador oficial atualizou apenas `validation-profile.json`; geração e
conferência passaram em 760 ms. A construção da imagem continua exclusivamente remota.

Merge local em staging, push de todos os commits dessa branch, todos os jobs obrigatórios
verdes e `deploy-staging` concluído pelo fluxo normal. Falhas novas devem ser corrigidas e
verificadas no GitHub; não se executam novamente testes pesados na máquina do usuário.
