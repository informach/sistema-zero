---
provider: manual
pr:
round: 15
created_at: 2026-10-17T02:06:34Z
---

## Summary

- Total: 1
- Resolved: 1
- Unresolved: 0

## Scope

Painel de extensões por linguagem: catálogo/ações Python, wrapper lazy e painéis JS/Python, ambiente fornecido pelo host, contexto/prop no Studio e publicação de configuração pelo store/CAS/histórico existentes. A integração de preview, UI visual restante e aprovação final de L4 não pertencem a este recorte.

## Evidence

- Comparação integral do painel JavaScript com HEAD: renomeação do componente, narrowing da linguagem e recusa de exemplo carregado após mudança do documento; restante do conteúdo preservado.
- `bun test src/python/extensions/operations.test.ts src/components/extensions/ExtensionsPanel.test.tsx src/components/extensions/PythonExtensionsPanel.test.tsx`: 18 pass, 0 fail, 72 expect() calls, exit 0, antes da nova regressão de revogação.
- Reprodução independente em memória: Classic e Pro instalavam Turtle após revogação de `grantedExtensionIds`, com uma única chamada de `access()`.
- Reprodução independente React/happy-dom depois da primeira correção: substituir o ambiente do Provider por outro que nega Turtle durante a instalação ainda publica a extensão. Apenas a entrega ao método real do store foi retardada; catálogo, componente, ação, leitor e commit usados foram os reais.
- Revalidação parcial da primeira correção: Classic consulta `access()` novamente antes do commit; Pro recusou revogação programada somente após a segunda consulta, exigindo a terceira na publicação final. Ambos preservaram a mesma referência do documento, dirty state e histórico vazio. A substituição do contexto ainda pendente nessa etapa foi corrigida e revalidada abaixo.
- Biome dos sete arquivos novos/movidos do painel/ambiente: exit 0, sem alterações. Nenhum navegador, TSC, servidor ou fonte foi modificado pelo revisor.
- Revalidação final: `policy()` é obrigatório e o painel consulta a última política React commitada, revogando a referência no unmount. `bun test src/python/extensions/operations.test.ts src/components/extensions/PythonExtensionsPanel.test.tsx src/state/proRevision.test.ts src/state/pythonProApplication.test.ts`: 22 pass, 0 fail, 102 expect() calls, exit 0; inclui troca real de Provider e curadoria durante instalação. Biome dos cinco arquivos de correção passou.
- Provas independentes adicionais: ambiente substituído por `null`, painel desmontado enquanto a instalação aguardava e substituição de política Pro somente depois da segunda checagem. Todos recusados sem publicação; o Pro consultou o getter uma terceira vez imediatamente antes do commit e não criou histórico.

## Recommendation

Achado medium resolvido e revalidado; nenhum achado pendente nesta fatia. Fonte e materiais foram preservados pelas operações examinadas; o catálogo Python não importa definições JS nem inicia o interpretador. A revisão não qualifica a feature inteira.
