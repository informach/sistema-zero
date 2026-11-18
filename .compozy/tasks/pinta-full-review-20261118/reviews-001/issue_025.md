---
status: resolved
file: packages/member-shell/src/lib/pinta-cloud-persistence.ts
line: 341
severity: high
author: codex
provider_ref:
---

# Issue 025: Floor e assinatura sem vínculo causal permitem reenviar cache antigo

## Triage

- Decision: `VALID`.
- Prova real em `.tmp/pinta-quota-stale-floor/probe.ts`, base 42b395d93: A reteve floor 4 em fallback de quota; B confirmou nativo 5/nuvem 4 e a marca compartilhada avançou para revisão 3. Autosave da aba antiga, que já tinha aberto 4 antes da promoção, deixou cache 4. A emitiu `{schema:4,baseRevision:3,formatVersion:4}` sem download/cópia. CAS e capacidade eram elegíveis para sobrescrever o completo.
- O leitor 4 recusa abrir 5; o vetor usa a cópia 4 já aberta em RAM, não uma leitura impossível de 5 pelo leitor 4.
- Outro vetor: gravador antigo preserva campos desconhecidos via spread, mas troca `writtenAt`. Esse campo sozinho não autentica a nova gravação.
- Correção autorizada: vincular floors e cache legado à revisão confirmada; fixar CAS antes de awaits; assinatura moderna com instante, schema calculado, revisão causal e capacidade nativa do gravador. Preservar origem de RAM antes de marca compartilhada avançar e marcar cache cortado antes de assinar entrada direta de persistência.
- Sem commits. Gate amplo/typechecks coordenados pelo parent. Exportações públicas adicionais restritas aos contratos já existentes `PINTA_MAX_SCHEMA` e `pintaAssetSchema` na face assets, autorizadas pelo parent.

## Fix

- Floors positivos e legado verificado ficam vinculados à revisão confirmada. Memória antiga sem revisão ou privada com revisão vencida exige conferência no produtor; autosave continua local. O produtor fixa a CAS antes dos awaits e não adota marcas que outra instância avançou durante o download.
- A assinatura contém instante, schema calculado do conteúdo, revisão causal, capacidade nativa e autoria da instância. `writtenAt` legado não é prova. O ACK só confirma assinaturas desta instância derivadas da base enviada; não retaga assinaturas de outra aba. Uma nova instância também rejeita a assinatura alheia persistida na revisão anterior.
- A primeira revisão observada ao carregar/listar permanece como origem de RAM. Persistência direta inspeciona a base local antes de assinar rebaixamentos; corte já observado permanece marcado. Load explícito da versão canônica assinada pode atualizar a origem e permite retirada legítima de recursos, mesmo com campo `schema` obsoleto em RAM.
- Reutiliza a recuperação de cache cortado, com original completo e cópia local. Descidas associam a revisão do documento realmente recebido. Conflito entre edições no mesmo formato avança a base somente depois de conservar a cópia remota. Igualdade de relógios não autentica documentos diferentes nem elimina a cópia de recuperação.
- Escopo restrito ao espelho de nuvem: não autentica procedência de RAM no IndexedDB local independente, nem adiciona journal/rede no autosave. Protege o documento canônico na conta com os contratos existentes de revisão e recuperação.

## Verification

- Prova original em `.tmp/pinta-quota-stale-floor/probe.ts`: antes, upload 4 com CAS3 elegível; depois, `payload:null`, um download de A e recuperação do original com cópia. A prova usa duas memórias de formato armazenadas, quota simulada e marcas compartilhadas; não representa quota física de dispositivo.
- Red/green adicional: retry de conflito 4↔4 emitia CAS2 novamente; agora emite CAS3 depois de conservar a cópia. Relógios iguais deixavam RAM4 no original contra remoto5; agora original 5 e cópia 4 são conservados.
- `bun test tests/pinta-cloud-persistence.test.ts` em community-kids: **71 pass, 0 fail, 408 expect**, 2,01 s. Inclui memória privada stale e legado, gravador antigo por spread, persistência direta, RAM anterior à promoção, downgrade legítimo, capacidade insuficiente, avanço de revisão durante download, ACK alheio e reabertura de C.
- `bun test tests/pinta-format-memory.test.ts` em member-shell: **6 pass, 0 fail, 13 expect**, 147 ms. Round-trip dos metadados e compatibilidade de entradas antigas, quota e propagação entre instâncias.
- `bun test src/assets/purity.test.ts` em pinta: **3 pass, 0 fail, 74 expect**, 566 ms. Exportações públicas adicionais não introduzem React ou UI no grafo.
- Gates amplos, typechecks, navegador e dispositivos físicos não foram executados por este agente; ficam coordenados pelo parent após congelamento. Nenhum commit criado.

## Fechamento da rodada

Revisão causal, capacidade, autoria e relógios iguais verificados em71 testes de nuvem e na suíte então completa de community-kids (1.698 aprovados). Floor não é autenticação de RAM por timestamp. A autoridade offline foi implementada posteriormente na issue 026, com evidências próprias.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
