---
status: resolved
file: packages/member-shell/src/server/studio-builder-tools.ts
line: 193
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Inspeções Python recusam caminhos portáveis da própria revisão

## Review Comment

inspectStudioBuilder valida request.path com isStudioProRevisionPath, o contrato JavaScript antigo que proíbe dist e limita12 segmentos. As revisões PythonV2 usam isStudioPortablePath, que admite dist e até16 segmentos. Assim o montador aceita/indexa uma fonte Python válida, mas as consultas read e search do Builder rejeitam o mesmo path. Para fontes truncadas no contexto inicial, a ferramenta não consegue ler/buscar o trecho necessário para propor a alteração.

Prova independente `.cache/review064-builder-boundaries.test.ts`: cria revisões PythonV2 válidas com dist/helper.py e um helper em13 segmentos, fontes públicas maiores que5000 caracteres e todas as pastas explícitas. Ambos entram no index; read e search rejeitam com Caminho de consulta inválido. `bun test ./.cache/review064-builder-boundaries.test.ts --test-name-pattern 'portable dist'`:1 pass,0 fail,8 verificações,exit0, afirmando o defeito. Não depende da ativação do executor/pipeline Python ainda em execução.

Despachar também o validador de path conforme a configuração da revisão: isStudioPortablePath para Python, preservando o contrato JavaScript existente. Manter recusa de traversal, aliases Windows e pastas proibidas pelo contrato Python. Não normalizar nomes nem renomear a fonte para contornar a divergência.

## Triage

- Decision: `VALID`
- Notes: Implementador passou a selecionar isStudioPortablePath para revisões Python e preservou isStudioProRevisionPath para JavaScript. Reproduzidor independente adaptado confirma read/search dos dois caminhos, recusa de traversal/CON/node_modules em Python e manutenção da recusa JS de dist. Combinado `.cache/review064-builder-boundaries.test.ts`, studio-builder-python-tools.test.ts, studio-builder-tools.test.ts e studio-builder.test.ts:29 pass,0 fail,152 verificações,exit0. Controle independente confirma sistemaJS byte-idêntico ao HEAD por igualdade de string e SHA, com dispatchPython distinto. Biome3 arquivos do recorte:exit0,sem alterações. Nenhuma produção modificada pelo revisor; ativação/autoridadefresh/validaçãofinal do pipeline Python permanecem fora deste sublote.
