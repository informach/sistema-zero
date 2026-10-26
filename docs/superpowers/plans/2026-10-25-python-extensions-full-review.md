# Revisão conjunta das extensões Python

**Base:** `44af4842022571789843efaa28db0e1f5a2d3917`.
**Checkout de início:** `d7de2a3b8`, com o complemento de permissões Pygame-ce já integrado.
**Objetivo:** revisar Turtle, Pygame Zero, Pygame-ce, Raylib 2D e Raylib 3D, corrigir falhas comprovadas e verificar jogos, blocos, execução e exportação.
**Arquitetura:** conservar as APIs Python e o isolamento do worker. Padronizar contratos compartilhados de autoria, ciclo de vida e compatibilidade, preservando diferenças necessárias entre desenho retido, listas de comandos, rasterização SDL e WebGL. Não substituir bibliotecas nem ampliar permissões sem necessidade demonstrada.
**Tecnologias:** TypeScript, Blockly, CPython/Pyodide, pygame-ce, Canvas/WebGL e Playwright.

## Critérios e execução

- [x] Conferir base, árvore limpa, instruções e comandos de verificação.
- [x] Inventariar contratos, paletas, resolutores, transporte, recursos, jogos e exportadores das cinco extensões.
- [x] Comparar as implementações com suas APIs de referência e documentar diferenças intencionais e limitações.
- [x] Reproduzir os defeitos funcionais em testes antes da correção; corrigir a causa e executar a regressão.
- [x] Conferir cobertura real dos exemplos em blocos e o conteúdo dos arquivos gerados.
- [x] Executar módulos Python nativos e jogos no worker do navegador, incluindo entrada, desenho, encerramento e desempenho.
- [x] Rodar suíte Studio, typecheck, análise estática e verificações dos geradores sobre o estado final.
- [x] Registrar resultados, evidências, limites e melhorias no relatório da revisão.

## Frentes da investigação

1. `src/python/extensions`, `src/python/blocks`, `src/python/officialModules.ts`: identidades, dependências, defaults e preservação do AST; instalação/remoção e sombreamento de módulos locais.
2. `src/runtime/python/{turtle,pgzero,pygame,raylib}` e `interpreter.{ts,py}`: estado por execução, limites, input, áudio, transporte e descarte de recursos.
3. `src/examples/python`, `scripts/generate-*-games.ts` e `scripts/python/*coverage*`: proveniência, conteúdo completo, reinício, progressão e cobertura em blocos.
4. `src/export`: equivalência de fontes e recursos no navegador e no computador; dependências explícitas e arquivos do autor preservados.
5. `e2e-runtime` e servidor de qualificação local: execução dos bytes atuais, sem confundir prova local com publicação de uma distribuição nova.

## Resultado da investigação

- Remoção das cinco extensões protegida por análise de referências, incluindo nomes implícitos do Pygame Zero e aliases Raylib.
- Defaults negativos de repetição Pygame-ce corrigidos para o AST do CPython; verificação transversal dos 549 codecs.
- Exportação Pygame-ce em subpasta, `display.update(None)`, paleta inicial, carregamento compartilhado, metadados e cobertura contínua corrigidos.
- 95 recibos requalificados: 71.169 blocos, 268 edições causais, zero nós opacos. Os 134 testes de navegador e o teste de carga passaram.
- Suíte geral: 11.108 testes aprovados, zero falhas, quatro skips existentes. Preservados os avanços de staging até `ead28d075`; typecheck e 74 regressões de navegador passaram sobre a combinação final.

O relatório `.audits/architectural-analysis-2026-10-25-python-extensions.md` detalha os 13 achados, as correções, evidências e limites. Esta tarefa autoriza os ajustes necessários; não inclui ativação remota do runtime.
