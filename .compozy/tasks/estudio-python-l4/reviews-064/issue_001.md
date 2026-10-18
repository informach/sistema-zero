---
status: resolved
file: packages/member-shell/src/server/studio-builder-tools.ts
line: 100
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Builder expõe e altera arquivos Python privados por nome

## Review Comment

O novo consumidor Python reutilizava protectedPath com uma expressão local mais fraca que a política compartilhada isStudioTutorSensitivePath. Arquivos como src/my-secrets.py e src/credentials_extra.py não eram protegidos. Se seu conteúdo usa uma variável genérica, a redação por valor também não os reconhece: fontes privadas entram em context.sources e read/search, e propose aceita modificar/apagar o arquivo. O prompt promete que arquivos protegidos não serão lidos ou editados.

Prova independente `.cache/review064-builder-boundaries.test.ts` no Shell: revisões PythonV2 válidas, contendo values=["family-private-builder-marker"] nos dois nomes, são reconhecidas como sensíveis pelo helper canônico, mas o montador e read entregavam o valor; uma proposta DELETE com hash correto era aceita. Prova original:1 pass,0 fail,8 verificações,exit0, afirmando o defeito. É um consumidor Builder novo;059 tratava o fallback de drafts na captura do tutor, e060 a sintaxe da redação, não esta divergência de política de path.

Reutilizar a política canônica para todos os segmentos, conservando a proteção de diretórios .env. A mesma regra deve impedir exposição no contexto/inspeção e alterações na proposta; não confiar na identificação textual de valores para um arquivo sensível por nome.

## Triage

- Decision: `VALID`
- Notes: Implementador aplicou helper canônico por segmento e normalização de caixa para .env. Prova independente adaptada confirma ausência do marcador em sources/read, indicação protegido e DELETE recusado. `bun test ./.cache/review064-builder-boundaries.test.ts --test-name-pattern 'canonical private'`:1 pass,0 fail,10 verificações,exit0. Combinado final de prova cache e ferramentas/orquestração JS/Python:29 pass,0 fail,152 verificações,exit0; Biome3 arquivos,exit0. Nenhuma produção modificada pelo revisor; pipeline/validação final Python ainda fora deste sublote.
