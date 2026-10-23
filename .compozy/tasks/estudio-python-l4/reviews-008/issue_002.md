---
status: resolved
file: packages/studio/src/python/blocks/selection.ts
line: 19
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Dependências do exemplo não bastam para compor o recurso

## Review Comment

A descoberta pelas formas dos exemplos identifica blocos para representar os placeholders, mas o mapa semântico não inclui dependências necessárias para o aluno construir o programa. Isso viola a seção 7.2, que exige acesso aos valores, parâmetros e funções necessários ao recurso liberado pelo admin.

Reprodução independente, catálogo real e todos os IDs aprovados: uma curadoria contendo apenas `sz_py_list_append` retorna integer, variable, expression, list_append e keyword. Não inclui `sz_py_list` nem `sz_py_assign`; o receptor padrão `lista` não pode ser criado com essa paleta. `sz_py_dict_keys` e `sz_py_set_add` apresentam a mesma lacuna para dicionário/conjunto e atribuição. Liberar somente `sz_py_return` retorna none, variable, expression e return, sem definição de função; não é possível construir seu contexto sintático válido. São variantes da mesma causa: o default reconstruível não demonstra a composição pedagógica completa.

Declarar dependências semânticas de autoria para essas famílias, além das derivadas do exemplo. Manter a aprovação e instalação de todas as dependências como condição obrigatória; uma dependência não aprovada deve causar recusa explícita, nunca instalação ou ampliação de autorização. Cobrir curadoria isolada dos recursos acima, verificar a presença dos auxiliares e a recusa quando um deles não estiver aprovado. Rever os demais blocos que exigem contexto próprio pelo mesmo critério.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com dependências semânticas de contexto e de receptores por receiverKinds, além da atribuição para variáveis. Revalidação independente confirmou os auxiliares nas seis curadorias isoladas list_append, dict_keys, set_add, return, break e continue. Retirar individualmente cada dependência da aprovação produziu 48 recusas explícitas; nenhum caso instalou extensão ou alterou os sets recebidos. IDs JS continuaram recusados. Testes frescos: 5 pass, 0 fail, 161 verificações; Biome dos dois arquivos, exit 0. Os ciclos de função/retorno e variável/atribuição completaram a seleção sem recursão infinita.
