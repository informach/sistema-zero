---
status: resolved
file: packages/pinta/src/core/project.ts
line: 749
severity: high
author: codex
provider_ref:
---

# Issue 022: Leitor completo de formato 4 ainda arredonda novos offsets fracionários

## Review Comment

Preservar frações com schema/envelope 4 não protege contra o baseline completo `567b93f95`, cujo leitor aceita 4 e arredonda offsets. A memória observa 4 antes e depois e não percebe o corte.

## Triage

- Decision: `VALID`.
- Reprodução com módulos reais do baseline extraídos por `git show` em `.tmp/pinta-baseline-format-review`: mapa atual schema 4 com offsets 16.5/0.25 e elipse foi aceito pelo leitor antigo; voltou schema 4, offsets 17/ausente e envelope 4. `pintaAssetSchema`: 4 antes e depois. Baseline declara/lê nuvem 3; recusa schema/envelope 5.
- Correção autorizada: nativo/envelope 5 somente para offsets fracionários de mapas ou mapas internos de conjuntos, propagando o carimbo ao conjunto externo. Mapas ricos inteiros continuam 4; camadas inteiras 3 e legados preservam forma canônica. Capacidade de nuvem passa a 4 por tipo versionado, recusando gravador 3 via `CREATION_CLIENT_OUTDATED`; nuvem 4 não é o mesmo número do documento 5.
- Backend já aceita versões até 65.535 e exige declaração pelo menos igual à versão confirmada ou pendente. Cobrir promoção 4 e rejeição de 3 nos três canais Pinta sem migrar schema de banco.
- Não modificar Molda 3D, contratos da cena executável ou motores/exportadores externos. O consumidor em `molda-client.tsx` que importa a capacidade Pinta pertence à biblioteca `tool:pinta`; a capacidade 3D é independente.
- Automatic commits disabled. Gate amplo coordenado pelo parent, pendente.

## Fix

- `PINTA_PRECISE_SCHEMA = 5` separado de `PINTA_SCENE_SCHEMA = 4`; leitor nativo aceita até 5.
- `tilemapNeedsV5` detecta somente offsets de camada fracionários finitos. O carimbo mínimo sobe para 5 nesses mapas e propaga ao conjunto externo via `mapSetSchemaFor`; recursos anteriores continuam 4/3/sem carimbo.
- Envelope 5 separado, calculado do conteúdo de mapas e definições; arquivos anteriores continuam com o mesmo cabeçalho e bytes quando não usam frações.
- Capacidade compartilhada de nuvem 4 para tipos versionados. Os produtores da galeria e da aula, e seus leitores, já usam esse contrato; nenhum número 5 foi copiado para a capacidade de nuvem.
- Backend não precisou de alteração: reserva, confirmação e exclusão já recusam versões abaixo da confirmada/pendente. Testes novos cobrem o cliente 3 perante item 4 nas criações livres e no rascunho de aula.
- Fixtures que chamavam 5 de futuro passaram a usar `PINTA_MAX_SCHEMA + 1`.

## Verification

Red→green: os cinco casos novos de `mapFormat5.test.ts` falhavam com schema 4; o caso de capacidade no core falhava com leitura 3. Após a correção: 118 testes estreitos em 12 arquivos, zero falhas, 611 asserções. Nenhuma suíte completa/typecheck/gerador executado neste lote.

- Pinta formatos 3/4/5, documento, objetos e conjuntos: `106 pass`, `0 fail`, `534 expect() calls`, 642 ms.
- IndexedDB (teste filtrado de schema 5): `1 pass`, `0 fail`, 5 asserções.
- Core capacidade: `6 pass`, `0 fail`, 43 asserções.
- Produtor de aula filtrado: `1 pass`, `0 fail`, 2 asserções.
- Espelho de galeria e recuperação 5→4 filtrados: `2 pass`, `0 fail`, 11 asserções. A cópia local cortada é preservada como cópia e a original 5 é recuperada da conta.
- Backend, dois testes filtrados de criações livres/aula: `2 pass`, `0 fail`, 16 asserções; recusa `CREATION_CLIENT_OUTDATED`, `requiredVersion:4` antes/depois do commit e na exclusão antiga.
- Biome aplicado somente aos 15 arquivos deste lote; gate amplo segue pendente com o parent.

Prova local adicional `bun .tmp/pinta-baseline-format-review/probe.ts` (módulos reais de `567b93f95`, inclusive `projectConfig` antigo fixado em max 4; imports de dependências sem mudanças semânticas nesta prova):

```json
{"baseline":"567b93f95","baselineNativeMax":4,"forced4":{"schema":4,"x":17,"y":null},"protected":{"schema":5,"envelope":5,"oldNativeRejects":true,"oldFileRejects":true,"oldSetRejects":true},"byteCanonical":{"rich4":true,"layers3":true,"legacy1":true},"cloud":{"oldWrite":3,"oldRejectsNew":true,"newWrite":4,"newRead":4}}
```

Os arquivos da prova estão em `.tmp` e não integram a entrega. Os testes CI novos não dependem de histórico git nem desse diretório temporário. Nenhum arquivo Molda, cena executável, motor ou gerado foi modificado por este lote.

## Fechamento da rodada

Leitor histórico real recusa mapa, conjunto e envelope 5; backups ricos4/camadas3/legados1 conservam bytes. Suítes Pinta/core/hosts/Members executadas com nuvem4.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
