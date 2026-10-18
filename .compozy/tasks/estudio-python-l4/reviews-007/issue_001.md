---
status: resolved
file: packages/studio/src/python/blocks/structuralCodec.ts
line: 42
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Reaplicar opção ativa substitui texto digitado pelo aluno

## Review Comment

O ramo de opções booleanas de reshape removia o campo/input correspondente e criava novamente seu valor padrão mesmo quando a opção já possuía o valor solicitado. Isso tornava setPythonOption não idempotente e alterava conteúdo numa operação que deveria conservar o estado.

Reprodução independente com Blockly real headless: criar sz_py_alias, ativar `asname:present`, preencher o apelido com `minha_tartaruga`, chamar novamente `setPythonOption('asname:present', true)`. O apelido passava silenciosamente para `valor`. No helper puro, a mesma recriação descartava os nós do input opcional recebido. O caminho de contagem já conservava valores ao repetir uma quantidade.

Retornar uma cópia sem alterações quando o valor solicitado já estiver aplicado, ou preservar explicitamente o campo/input existente. Verificar também que repetir uma opção não modifica estado salvo nem a conexão de um valor autoral.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com retorno de structuredClone(shape) para valor já aplicado, e revalidado independentemente. A repetição mantém `minha_tartaruga`, deixa o estado serializado idêntico e preserva o bloco inteiro conectado ao retorno, incluindo o valor 42. Chamada direta de reshape com um inteiro de alta precisão conserva o conteúdo e retorna cópias independentes do shape e do nó. Regressões frescas: 11 pass / 490 verificações em blockly.test.ts e coreCatalog.test.ts, exit 0; Biome dos sete arquivos do recorte, exit 0. Nenhuma implementação alterada ou browser executado pelo revisor.
