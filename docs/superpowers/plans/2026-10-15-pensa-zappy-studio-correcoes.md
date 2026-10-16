# Pensa, Zappy e Estúdio: correções de integração

> Execução nesta sessão com a skill executing-plans. O pedido “Corrija todos os problemas que você achou” autoriza implementar as recomendações do relatório. Não há nova decisão de produto pendente.

**Goal:** corrigir os oito achados e as falhas de verificação da auditoria.
**Architecture:** manter StudioCore e as fronteiras de autorização existentes; compartilhar a composição dos hosts Kids. Explicitar a modalidade de autoria das missões, com orientação de código que preserve objetivo, evidência e progresso. Compartilhar decisões e atualização do saldo entre conversa e construção.
**Tech Stack:** TypeScript, React, Next, Bun, Playwright, PostgreSQL.
**Spec:** .audits/architectural-analysis-pensa-zappy-studio-2026-10-15.md

## Restrições
- Não tocar alterações preexistentes de outros trabalhos.
- Não publicar, implantar ou chamar modelos pagos para verificar as correções.
- Preservar namespace por perfil, evidência de nuvem, CAS, autoria e proteção de suporte.
- Sem sleeps para esconder races, supressões de erro de tipo ou migrações destrutivas.
- Nenhuma passagem entre modos pode restaurar silenciosamente blocos sobre código.

## Tarefas
- [x] 1. Serviços comuns dos hosts: extrair publicação e tutor de studio-full-client.tsx; usar nos dois hosts. Propagar share/onChange/onError no studio-pro-editor.tsx. Ler voz, créditos e desafio na página Pro com a mesma regra da página clássica. Extrair atividade de studio-full-editor.tsx e ligar no Pro; preservar retorno ao Pensa.
  - Arquivos novos: components/kids/use-studio-share.ts, use-studio-tutor.tsx, use-studio-activity.ts; lib/studio-error.ts.
  - Testes: studio-full-editor.test.tsx e novo studio-pro-editor.test.tsx/serviços; validar callback de publicação, atividade só em autosave e nenhuma atualização do router com editor aberto.
  - Comando: bun test tests/studio-full-editor.test.tsx tests/studio-pro-editor.test.tsx.
- [x] 2. Contexto e consumo do Zappy Pro: resumo de decisões comum no core/projeto; contrato de tutor e BFF; prompt trata notas como dados. Atualizar saldo ao finalizar/cancelar construção, sem atravessar perfil/projeto. Pro não consulta desbloqueios de blocos.
  - Testes: tutor.test.ts, ProBuilderPanel/ZappyPanel tests, member-shell/tests/studio-zappy.test.ts.
  - Verificar que pergunta com notas mantém os dados e pergunta Pro funciona com serviço de blocos indisponível; clássico continua exigindo os desbloqueios.
- [x] 3. Missões e modalidade: inspecionar contrato de capacidade/guia e persistência, estender com modo de autoria reconhecido no servidor. A projeção para Pro deve manter critérios e IDs, substituir apenas instruções dependentes de blocos por orientação de código adequada, e não narrar o guia anterior.
  - Testes core, contexto/planner no member-shell e use-studio-task-session.test.tsx.
  - Cenário: missão de movimento em blocos → converter → código com guia coerente → salvar nuvem → concluir → voltar ao plano.
- [x] 4. Testes de infraestrutura: incluir migrações compartilhadas no fixture Pensa; definir segredo de reconcile no preload; investigar lifecycle do subprocesso de storage e menu Monaco.
  - Comandos: bun test tests/pensa-ai.test.ts tests/studio-ai-reconcile.test.ts; suíte PostgreSQL em container próprio; bun test src/state/projectStorageBrowser.test.ts; Playwright zappy-assistance.
  - Não aumentar timeout sem resolver a causa.
- [x] 5. Clareza e dívida: nomenclatura coerente de Pro e clássico, informar franquia compartilhada e fonte; remover somente UI antiga comprovadamente inacessível preservando API pública utilizada; atualizar docs/zappy.md e contrato Pensa.
- [x] 6. Verificação final: typecheck dos pacotes afetados, lint, suites relacionadas e Studio src completo; PostgreSQL novo sem intervenção manual; navegador assistência/publicação e integração dos hosts reais com dependências externas controladas.
  - Atualizar .audits/.../qa com resultados novos sem apagar evidências anteriores.
  - Conferir git diff e status; relatório final com resultado e limites.

## Critérios observáveis
```ts
expect(proEditorProps.share?.publication).toBeDefined()
expect(proEditorProps.onChange).toBeDefined()
expect(proRequest.context.pro?.decisions).toBeDefined()
// O teste do guia compara os critérios e as IDs com a missão original.
expect(proGuide.criteria).toEqual(originalGuide.criteria)
expect(proGuide.steps.map(step => step.id)).toEqual(originalGuide.steps.map(step => step.id))
```
Contrato final: `studioAuthoring` é derivado da criação confirmada no servidor; `context.authoring` registra a modalidade do guia. `codeTransition` muda apenas a apresentação: o guia, seus IDs e critérios permanecem intactos. Instruções de transição não produzem IDs de progresso. Checklists obrigatórios de planos antigos permanecem acessíveis e exigem confirmação explícita. Atalhos do plano e da próxima missão usam navegação completa para a rota Pro quando a criação já é de código.


## Verificação concluída

Os seis typechecks passaram. Studio: 9.033 testes; Pensa: 134; member-shell: 387; Kids: 179; members: 221; Core: 14; PostgreSQL: 48. Assistência, publicação e smoke Pro passaram no navegador. Biome: 67 arquivos sem erros/avisos. Os logs e os limites estão no [relatório de correções](../../../.audits/pensa-zappy-studio-2026-10-15/qa/fixes/report.md). A intermitência antiga do subprocesso de armazenamento não voltou a ocorrer e não foi declarada resolvida por uma causa ainda não comprovada.
