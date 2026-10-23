---
status: resolved
file: packages/studio/src/python/blocks/readWorkspaceState.ts
line: 168
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Não restaurar títulos derivados como campos autorais

## Review Comment

A introdução do FieldLabel nomeado PYTHON_TITLE tornou esse campo reconhecido pelo leitor de workspace. A checagem de existência/valor do campo não distinguia dados autorais serializáveis de apresentação derivada. Um cache importado podia então definir o título de um bloco, contrariando o contrato de rótulos vindos do catálogo/contexto.

Prova independente com Blockly e reader reais: sz_py_pass com fields={PYTHON_TITLE:'official Turtle hacked'} era aceito e restaurava esse título. A atualização de apresentação só visita famílias com binding/receiver, portanto não corrige títulos arbitrários em blocos genéricos. Não há execução de código nesta prova; o problema é uma afirmação pedagógica não confiável.

Recusar campos que não sejam serializáveis/autoriais, inclusive PYTHON_TITLE, antes de aceitar o estado restaurado. Preservar texto incompleto nos campos realmente editáveis.

## Triage

- Decision: `VALID`
- Notes: O implementador confirmou que títulos são derivados e acrescentou getField(name).isSerializable() à guarda do reader. Revalidação independente recusou o mesmo payload adulterado; nenhum workspace temporário permaneceu. Nenhuma implementação alterada pelo revisor.

## Verification

- Mesmo payload após correção: forgedRejected=true.
- Regressão permanente acrescentada ao reader. Provas e suite final do recorte serão registradas em _meta.md.
