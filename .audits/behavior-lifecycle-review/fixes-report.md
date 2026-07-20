# Fechamento das correções — áreas de comportamento

**Data:** 2026-07-19, America/Sao_Paulo  
**Escopo:** núcleo do Estúdio, cinco extensões oficiais, migração, geração,
runtime, World Composer, documentação e cobertura da divisão de comportamento.

## Resultado

Os dez achados da auditoria foram corrigidos. Projetos novos continuam vazios e
a criança escolhe quais Áreas do projeto criar. As áreas de comportamento são
agora independentes: **Ao iniciar**, **Quando acontecer — Eventos** e
**Enquanto estiver rodando — Loops**. Blocos legados permanecem apenas para
migração transparente e não aparecem nas paletas oficiais.

## Fechamento por achado

| Achado | Estado | Correção |
|---|---|---|
| F-01 — travas de contexto | Corrigido | Um contrato canônico de `placement` é materializado em todas as definições e consumido pelo verificador de conexões, incluindo toda a subárvore que será encaixada. |
| F-02 — blocos legados visíveis | Corrigido | Wrappers e boots antigos continuam registrados para abrir projetos antigos, mas são marcados como ocultos e filtrados das paletas oficiais. |
| F-03 — drift Blockly × IR | Corrigido | A classificação usa o contrato registrado; `eventHandler` é evento no Blockly e no IR. A cobertura exaustiva percorre todo o catálogo oficial. |
| F-04 — migração parcial | Corrigido | A migração ocorre por área, preserva IDs, entende estados parcialmente organizados e usa marcador de versão para não reorganizar rascunhos intencionais. |
| F-05 — exclusão apaga filhos | Corrigido | Excluir uma Área do projeto solta o conteúdo como rascunho antes da exclusão; desfazer reconecta área e conteúdo no mesmo grupo. |
| F-06 — IR sintaticamente impossível | Corrigido | A validação recursiva rejeita eventos/loops aninhados e comandos dependentes de função, laço, evento, classe ou contexto assíncrono quando usados fora do lugar. |
| F-07 — Composer antigo | Corrigido | O World Composer procura a área compatível pelo contrato, nunca cria uma área automaticamente e orienta a criança a criar **Ao iniciar** quando necessário. |
| F-08 — lifecycle implícito | Corrigido | Todas as extensões oficiais declaram contrato obrigatório; o gerador resolve o adapter sem `switch` por motor e o `ProjectRunContext` centraliza RAF, cadências, pausa, retomada, restart e descarte de recursos. |
| F-09 — documentação defasada | Corrigido | CLAUDE, contrato de extensões, manifests, resumos e contextos de IA foram atualizados para as cinco áreas opcionais, boot automático e três momentos de comportamento. |
| F-10 — cobertura insuficiente | Corrigido | Foram adicionados testes exaustivos de catálogo/IR, migração, rascunho, unicidade, exclusão/undo, Composer, runtime e E2E Chromium dos fluxos críticos. |

## Garantias implementadas

- Áreas de evento e loop não podem ser aninhadas em comandos, funções ou entre
  si; comandos como `break`, `return`, `await`, `super` e valores do evento são
  validados no contexto completo.
- Duplicar uma área preserva seu conteúdo como rascunho. A guarda espera a
  desserialização terminar antes de remover a duplicata, evitando perda durante
  colagem/importação.
- Projetos antigos com a moldura única ou migração incompleta são separados de
  modo determinístico. Projetos já marcados como atuais conservam blocos soltos
  e mostram diagnóstico visual claro.
- O código da criança contém somente as três fases. Boot, reinício e descarte do
  motor são responsabilidade do contrato interno da extensão.
- O layout continua com as Áreas do projeto em duas linhas e nenhuma área é
  inserida automaticamente em projeto novo.

## Evidência fresca

| Verificação | Resultado |
|---|---|
| Testes focados de lifecycle (10 arquivos) | **59 pass, 0 fail, 5.396 expectativas** |
| Guard atual do runtime Jogo 2D Avançado | **6 pass, 0 fail** |
| Typecheck | **PASS** — `tsc --noEmit` |
| Build do playground | **PASS** — 1.419 módulos transformados |
| E2E Chromium das correções | **3 pass** — exclusão/undo, ausência do legado e World Composer |
| Diff | **PASS** — `git diff --check` sem erros |

## Estado dos gates globais no worktree compartilhado

O escopo corrigido está verde, mas o worktree recebeu alterações paralelas
durante a verificação. Por isso, os gates globais não são apresentados como
verdes:

- `bun run check` encontra quatro erros de formatação/importação exclusivamente
  em `canvas.ts`, `canvasAudit.test.ts` e `canvasPipeline.test.ts`, arquivos de
  uma alteração paralela de Canvas que não foram reformatados por esta revisão.
- A última suíte integral observou **4.122 pass e 1 fail**. O único guard falhou
  contra uma versão de `game-2d-advanced` que foi substituída durante a própria
  execução; o arquivo atual passou isoladamente com **6/6**. Uma execução
  anterior também mostrou drifts transitórios de Canvas que desapareceram no
  rerun, confirmando o worktree em movimento.
- O comando E2E global ficou sem iniciar a saída do Playwright por mais de nove
  minutos e deixou um servidor Vite órfão na porta 5195. O processo órfão foi
  encerrado e o spec específico passou novamente, **3/3**, em 12,7 s.

Essas ocorrências não alteram o resultado dos testes focados nem foram mascaradas
com mudanças nos arquivos paralelos.
