# Consolidação dos dois rascunhos do Estúdio

Solicitação: integrar as duas referências locais remanescentes em `staging` e remover as branches, preservando a implementação aceita e os materiais dos cursos.

## Diagnóstico já aplicado

Referência original: `backup-studio-diagnostic-draft-20261119`, commit `60c8afa9702357aa4e814eee4884c8b5a311b1fa`.

O snapshot contém a opção `STUDIO_MENU_CAPTURE`, os hooks de tracing nativo e a verificação de fechamento do menu em `reload-flush.spec.ts`. Os arquivos alterados do snapshot são idênticos aos atuais. O terceiro pai conserva o helper originalmente não rastreado `nativeInputTrace.ts`; sua versão atual só simplifica uma condição equivalente com optional chaining.

Foi feito merge normal para registrar essa ancestralidade. Não houve alteração de código nem substituição dos testes atuais pela versão antiga. O snapshot, seus pais e o helper original permanecem recuperáveis no histórico após remover a branch.

## Laboratório incremental rejeitado

Referência original: `estudio-incremental-lab-20261118`, commit `582aa52b08978dd7375df044b8f3bb9bb21392ff`.

O relatório existente em [protótipos rejeitados](2026-11-18-studio-incremental-rejected-prototypes.md) mede abertura de 5 mil blocos em 36,90/77,13/92,12 segundos, contra controles de 12,82–15,48 segundos. Registra também a falha do aceite de 10 mil blocos. Essa implementação não constitui uma melhoria pronta para ativação.

A integração é **histórica, sem ativação do protótipo**: merge com estratégia `ours`, preservando a árvore de implementação aceita e tornando o commit do laboratório ancestral de `staging`. Isso mantém todos os fontes, testes e medições recuperáveis no próprio Git, sem pastas duplicadas, branches auxiliares ou carregador rejeitado no produto. Os relatórios já estavam versionados na árvore atual.

Para consultar o código original depois da exclusão da branch:

```sh
git show 582aa52b08978dd7375df044b8f3bb9bb21392ff:packages/studio/src/blockly/incrementalWorkspaceLoad.ts
git show --stat 582aa52b08978dd7375df044b8f3bb9bb21392ff
git show 60c8afa9702357aa4e814eee4884c8b5a311b1fa
```

## Verificação

- Índice conferido antes dos merges; mudanças das outras frentes não foram incluídas.
- Diff do merge de diagnóstico em `packages/studio`: vazio.
- Diff do merge histórico em `packages/studio`: vazio.
- Conferir ancestralidade de ambos os commits e sincronização com `origin/staging` antes de remover as duas branches.

Não há nova funcionalidade de carregamento incremental entregue por esta consolidação. A missão continua com as pendências já registradas; não foram alterados aparência, runtime, persistência, blocos ou referências dos cursos.
