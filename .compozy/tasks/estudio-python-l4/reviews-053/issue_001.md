---
status: resolved
file: packages/studio-runtime/src/publications.ts
line: 107
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Promoção Python confirma registro que o próprio leitor recusa

## Review Comment

`promotePythonPublication` aceita IDs de projeto conforme `StudioProjectDocumentSchema`/`isStudioProjectId`: de 1 a 128 caracteres de `[A-Za-z0-9_-]`, incluindo `_game` e `-game`. Já `readState` exige que o primeiro caractere seja alfanumérico. Portanto a promoção inicial de um documento Python válido grava fonte, receita e ponteiro, devolve sucesso e um histórico válido, mas a próxima leitura pública, consulta privada ou atualização rejeita o mesmo registro com 409 (`Registro de publicação inválido.`). O link publicado fica inutilizável e nem o retry idempotente pode recuperá-lo. Projetos importados/restaurados podem possuir esses IDs mesmo que a factory normal use ULID.

Reprodução independente em `packages/studio-runtime/.cache/review053-publications.test.ts`, primeiro teste: para `_game` e `-game`, o schema Core aceita o documento, a promoção devolve `StudioPythonPublication` válida e grava `state.json`; logo depois, `currentPublishedSource` e `publicationCommand(operation: 'get')` falham com a mensagem acima. Comando no pacote Studio Runtime: `bun test ./.cache/review053-publications.test.ts tests/python-publications.test.ts tests/publications.test.ts` — 16 pass, 0 fail, 131 verificações. O teste de reprodução afirma o defeito observado, não o comportamento desejado.

Alinhar admissão e leitura ao contrato compartilhado `isStudioProjectId`, garantindo que todo registro confirmado possa ser lido. Conferir também a entrada JavaScript para evitar três regras diferentes de ID. Cobrir publicação/leitura/retry/atualização dos prefixos válidos e rejeição dos IDs realmente inválidos antes de qualquer gravação. Não mudar o documento autoral nem normalizar seu ID silenciosamente.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado independentemente. `readState` agora aceita `isStudioProjectId`; a exceção para IDs antigos com ponto/dois-pontos é restrita a registros JavaScript. A nova promoção JavaScript também usa o contrato compartilhado. A prova cache foi convertida para o comportamento correto e ampliada: `_game`, `-game`, IDs de um único `_`/`-` e tamanho128 publicam, leem, repetem a operação e atualizam sem mudar o ID. JavaScript com prefixo válido funciona; registros JS antigos com ponto/dois-pontos permanecem legíveis; novas admissões inválidas são recusadas antes de gravar e Python não herda a exceção legada. `bun test ./.cache/review053-publications.test.ts tests/python-publications.test.ts tests/publications.test.ts`, em `packages/studio-runtime`: 18 pass, 0 fail, 203 verificações, exit0, sem avisos. Inclui tombstone durante promoção e recuperação após resposta de CAS perdida. Nenhuma fonte de produção modificada pelo revisor.
