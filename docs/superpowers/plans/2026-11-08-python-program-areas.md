# Python Program Areas Implementation Plan

**Goal:** implementar a proposta aprovada de Programa, índice de definições e rascunhos, reduzindo o SVG ativo sem mudar a execução Python.
**Architecture:** uma área Blockly obrigatória contém a sequência executável. Raízes externas são rascunhos persistidos, excluídos da projeção executável. Um controlador de apresentação recolhe definições e retira do DOM os corpos recolhidos, conservando modelos Blockly, IDs, conexões e histórico; o índice abre uma definição por vez e revela ancestrais na Ponte.
**Tech Stack:** React, Blockly, TypeScript, CPython/Pyodide existentes; sem dependências adicionais.
**Spec:** `docs/plans/2026-11-08-python-project-areas.md`, aprovada pelo usuário em 08/11.
**Execution:** inline, com executing-plans e verificação por etapa. A autorização de implementar já foi dada.

**Revisão posterior:** a perda de rascunhos após editar o código e a falta de acesso a funções recolhidas em rascunhos foram corrigidas. A coleção guarda as peças externas por arquivo, independentemente do cache de Programa; o índice também revela suas funções/classes aninhadas. Os dois casos têm regressões no Chrome e cobertura de persistência. Relatório: `docs/qa/2026-11-08-python-program-areas-review.md`. O usuário dispensou compatibilidade com projetos de alunos e reforçou a atualização de todos os exemplos da galeria.

## Restrições

- Fonte completa é autoritativa. Migração conserva bytes e ordem dos comandos existentes.
- Mover/recolher é apresentação. Retirar uma instrução do Programa é edição semântica, com desfazer/refazer.
- Rascunhos são dados separados da projeção executável, não `pending` para sempre.
- Observador pode navegar; não pode publicar edições.
- Seleção da Ponte/tutor revela o bloco correto, inclusive em definições aninhadas.
- Desempenho medido sem iniciar profiler durante a janela de quadros. Baseline já registrado no relatório de 08/11.

## Tarefa 1 — Área executável e rascunhos

Arquivos: criar `src/python/blocks/programArea.ts` e teste; alterar `blockly.ts`, `workspacePresentation.ts`, `workspaceState.ts`, `readWorkspaceState.ts` e `restoreWorkspace.ts` no pacote studio.

- [x] Registrar `sz_py_program`, uma área sem conexões externas, indeletável, com input `BODY` de check `Python:statement`.
- [x] Implementar `ensurePythonProgramArea(workspace, rootIds, path): string[]`. Em estados antigos conectar as raízes existentes na ordem recebida; em estados novos retornar apenas a área. Nenhuma raiz antiga válida vira rascunho.
- [x] Ler o corpo da área como módulo; ignorar raízes externas apenas quando uma área válida existe. Rejeitar áreas duplicadas/aninhadas. Estados antigos mantêm a validação anterior.
- [x] Salvar/restaurar área e rascunhos com os validadores existentes, sem perder IDs ou metadados de origem.
- [x] Testar equivalência AST antes/depois, programa vazio, rascunho incompleto, inclusão/remoção e restauração de estado não confiável.

```ts
const before = pythonVisualToAST(pythonWorkspaceToVisual(ws, roots))
const area = ensurePythonProgramArea(ws, roots, 'main.py')
expect(pythonVisualToAST(pythonWorkspaceToVisual(ws, area))).toEqual(before)
ws.newBlock('sz_py_integer') // scratch does not enter the module
expect(pythonVisualToAST(pythonWorkspaceToVisual(ws, area))).toEqual(before)
```

## Tarefa 2 — Apresentação por definição

Arquivos: criar `src/python/blocks/programNavigation.ts` e testes; integrar em `PythonBlocklyEditor.tsx`.

- [x] Índice de funções/classes na ordem da fonte, com nível de aninhamento e rótulo legível.
- [x] Recolher definições por padrão na abertura inicial; respeitar apresentação salva.
- [x] Retirar os SVGs dos corpos recolhidos do DOM e recolocá-los no pai correto antes de expandir ou reestruturar. Manter todo o modelo Blockly, sem substituir código por texto opaco.
- [x] Navegar abre o caminho de ancestrais e recolhe outras definições. Antes de limpar/dispor o workspace restaurar os SVGs para o ciclo de vida normal.
- [x] Recolhimento não cria passos no histórico semântico. Mudanças de campos/conexões continuam no histórico Blockly existente.
- [x] Provar que abrir/recolher não altera serialização semântica, que seleção cruzada revela blocos internos e que salvar/reabrir conserva apresentação.

## Tarefa 3 — Interface e persistência

Arquivos: `PythonBlocklyEditor.tsx`, `workspaceState.ts`, `programNavigation.ts`, estilos locais do Studio.

- [x] Cabeçalho Programa + nome do arquivo + ordem de execução; seletor pesquisável de definições, voltar ao Programa, recolher e indicador/foco de rascunhos.
- [x] Integrar migração no carregamento, navegação em Ponte/tutor, limpeza no unmount e retomada após análise.
- [x] Distinguir alteração de apresentação/rascunhos da projeção executável para evitar análise Python desnecessária. Comparar o programa normalizado, sem coordenadas/colapso e sem raízes de rascunho; nunca ignorar campos ou conexões executáveis.
- [x] Testar rascunhos persistidos sem execução, retirar/recolocar instrução, undo/redo e novo arquivo vazio.

## Tarefa 4 — Qualificação e desempenho

Arquivos: fixtures e specs `e2e-python-editor`, `scripts/profile-python-classic.mjs`, relatório QA.

- [x] Adaptar navegação das fixtures ao Programa e à expansão por função usando o controlador real.
- [x] Executar Pac-Man: edição real, salvar/reabrir, fonte/material intactos, movimento por pixels, histórico e rascunhos.
- [x] Medir número de blocos no modelo versus SVG conectado, latência de arraste e quadros; se retirar corpos não atingir o orçamento, otimizar o caminho medido antes de concluir.
- [x] Rodar testes de blocos Python, áudio e autorização; lint, build e typecheck. Registrar limites reais e decisões no relatório.

## Revisão do plano

Todos os requisitos da proposta têm tarefas acima, inclusive migração e rascunhos. A renderização sob demanda conserva o modelo inteiro para evitar reimplementar histórico/transações por escopo. A medição decidirá se esse mecanismo basta ou se é necessária uma divisão adicional do desenho. Nenhum deploy está incluído.

## Resultado da execução

Área, rascunhos, navegação e montagem sob demanda implementados. A apresentação mantém apenas 147 SVGs conectados no Pac-Man, conservando os 2.022 blocos no modelo. Nas duas medições finais, o tempo acumulado em tarefas longas passou de aproximadamente 1.400 ms para 105–106 ms; a prévia ficou em 26 ms no p95. Uma tarefa de aproximadamente 105 ms ainda aparece no arraste inicial, limite explicitado no relatório; não se promete ausência total de pausas.

O cabeçalho acompanha a definição realmente aberta pela Ponte ou pelo índice. A qualificação cobre migração, rascunhos incompletos, restauração e proteção de estado, parâmetros de funções, edição real, persistência, histórico, exclusão/undo de classe, definição aninhada, tela estreita e execução por teclado/pixels. Foram aprovados 148 testes de Studio, 18 de autorização e os dez cenários E2E Chrome, além de build, lint e checagem de tipos.

Os nomes “Preparação” e “Início” do desenho conceitual não viraram classificações automáticas: a área exibe a sequência verdadeira, e os pontos do índice são as definições existentes. A implementação e os resultados permanecem no worktree isolado. Relatório: `docs/qa/2026-11-08-python-classic-performance.md`.
