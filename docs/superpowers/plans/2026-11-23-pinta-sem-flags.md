# Pinta Cenários 2D — sem flags (23/11/2026)

Decisão da dona: "Não precisa ter flag de nada. Eu só vou promover para produção quando tudo estiver
pronto e testado em staging." Este lote tira toda flag, variável e lista de liberação que a missão
criou. O comportamento novo vale para todo perfil, sem ramo morto.

## Inventário

| Flag / variável | O que ligava | Quem lia | Padrão | O que virou |
|---|---|---|---|---|
| `NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1` | A fila causal e as paletas negociadas no navegador (Pinta solto e biblioteca de paletas do Molda) | Cliente: `pinta-client.tsx`, `pinta-palette-scope.tsx`; build: `ARG`/`ENV` nos Dockerfiles de `community` e `community-kids`; guarda `scripts/ci/pinta-causal-build-flag.test.ts` | `0` (desligada) | Saiu do código, dos Dockerfiles e do CI. O host lê o escopo da conta que o servidor entrega (`PintaAccountSession` → `usePintaAccount`). |
| `pintaCausalAllowed` (prop) | A página do Pinta dizia ao `PintaClient` se o perfil era elegível | Páginas `/pinta` das duas comunidades → `PintaClient` | `false` | Saiu. O `PintaClient` decide só pelo escopo da conta, que também cobre o Pinta do Arquipélago (antes ele ficava no caminho antigo). |
| `PINTA_CAUSAL_CANDIDATE` | Rotas causais do BFF; elegibilidade da página; escopo `pinta` do worker de limpeza. No Members: montar o inventário causal, a leitura causal da galeria da aula e o teto de 2 MiB das provas | BFF (`member-shell/src/lib/env.ts`, `pinta-causal-eligibility.ts`, `creation-cleanup.ts`); Members (`env.ts`, `composition-root.ts`, `server.ts`) | desligada | Saiu. O Members monta sempre o inventário causal e a galeria causal; o teto das provas vale sempre; o worker declara sempre `pinta`. |
| `PINTA_PALETTE_WRITE_CANDIDATE` | Rotas de paleta negociada (CAS) no BFF e no Members; escopo de paletas da página | BFF (`env.ts`, `pinta-causal-eligibility.ts`, `creation-cleanup.ts`); Members (`env.ts`, `composition-root.ts`) | desligada | Saiu. Paleta negociada montada sempre. |
| `PINTA_CAUSAL_QA_PROFILES` (lista de perfis causais e de QA) | Só os pares exatos `audience + accountId + userId` da lista usavam a nuvem causal e as paletas | BFF (`pintaCausalProfileAllowed` → 404; elegibilidade da página); Members (rotas causais, rotas de paleta, `GalleryDeliveryService.causalHeads`); core (`parsePintaCausalQaProfiles`, `pintaCausalQaAllows`) | lista vazia = ninguém | Saiu, com as funções do core e o teste delas. O dono é o aluno ativo da sessão (`learnerIdentity`): perfil kids com a conta responsável; adulto = a própria conta. Pais, conta inativa, perfil kids sem conta e adulto com perfil ativo recebem 403 antes de qualquer chamada. |
| `STUDIO_SEALED_PARTS_CANDIDATE` + `STUDIO_SEALED_QA_PROFILES` | O gravador selado do Estúdio (partes autoritativas) e a lista de perfis dele | Members (`env.ts`, `composition-root.ts`, `server.ts`, `studio-sealed-writes.routes.ts`) | desligada / vazia | Saíram. Gravador selado montado sempre. |
| `PINTA_WORKSHOP_SERVICE_READER` | O BFF admitir o corpo nativo 9 (nuvem 8: autorregras e projeções) | BFF (`pinta-causal-proof.ts`, `readerOptions.allowWorkshop`) | desligada | **Portão de capacidade não pronta → constante.** `WORKSHOP_BODY_READABLE = PINTA_INVENTORY_READER_VERSION >= 8` (`member-shell/src/server/pinta-causal-proof.ts`). Hoje o leitor anunciado é 7, então fica fechado. Só abre quando a etapa 8 subir o leitor no core; não há variável. |
| `pintaCausalEnabled` (dep do worker de limpeza) | Injeção de teste para o escopo `pinta` | BFF (`creation-cleanup.ts`) | lia as duas flags | Saiu; o escopo é fixo. |

### O que sobrou e não é flag

- **Infraestrutura do BFF:** `pintaAccountStorageReady()` exige `MEMBER_SHELL_HMAC_SECRET` e as
  credenciais do R2 privado (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_UGC_BUCKET`). Sem elas o BFF não consegue assinar nem conferir bytes: as rotas
  `/api/pinta/causal/*` e `/api/pinta/palette/*` respondem 404 e o escopo é nulo. Essas variáveis já
  existem em staging e produção nas duas comunidades.
- **Rotas internas do Members:** continuam exigindo `INTERNAL_API_TOKEN` e o consumidor
  `member-shell` (presente em staging e produção).
- **Suporte em modo leitura** não recebe o escopo (como antes). Ver pendências.

### Regiões na conta

As regiões (nativo 8 / nuvem 7) na conta dependiam da fila causal. Com o escopo para todo aluno ativo,
o `PintaClient` monta a oficina regional na fila causal para todo perfil logado; sem conta, ela fica
só no aparelho. O nativo 9 continua fora (`nativeCeiling: 8` e a constante acima).

## Provas

| Pedido | Teste |
|---|---|
| Perfil grande e antigo adotado sem perda; a adoção retoma se cair no meio | `packages/members/tests/db/pinta-causal-adocao.test.ts` (150 desenhos, 10 folhas, mapas, lápide, reserva em voo e paletas do escritor antigo; servidor real sem variável do Pinta; cai e reinicia no meio) |
| Cliente ou aba antiga num perfil causal: recusa clara, sem corromper nem perder o que está no aparelho | `packages/members/tests/db/pinta-causal-http.test.ts` (409 `PINTA_CAUSAL_CONFLICT`/`protocol-required` sem tocar na linha) e `packages/community-kids/tests/pinta-cliente-antigo.test.ts` (o espelho antigo mantém tudo no aparelho, sem PUT, commit nem DELETE) |
| Galeria da aula com o perfil causal padrão | `packages/members/tests/integration/gallery-delivery.test.ts` e `packages/member-shell/tests/pinta-causal-routes.test.ts` |
| Pinta da aula (missão aberta no `/pinta`, sob o layout) e Pinta do Arquipélago | `packages/member-shell/tests/fixtures/pinta-regions-host.fixture.tsx` (escopo da conta → oficina causal; a missão conclui pela oficina) |
| Biblioteca do Estúdio e envio ao Estúdio | `packages/member-shell/tests/fixtures/pinta-studio-bridge.fixture.tsx` (padrão = escopo da conta, fila causal ligada) |
| Escopo só do aluno ativo, sem variável | `packages/member-shell/tests/pinta-account-session.test.ts`; rotas: `pinta-causal-routes.test.ts` |
| As variáveis não voltam | `scripts/ci/pinta-sem-flags.test.ts` |

O passo "Testes DB members" do CI ganhou `PINTA_CAUSAL_ADOPTION_TEST_DATABASE_URL`.

## Variáveis remotas sem uso

Leitura só dos nomes (23/11/2026) em `members`, `community`, `community-kids` e `api-gateway`, staging
e produção do Railway: **nenhuma** das variáveis acima está definida (a homologação autenticada que as
ligaria nunca rodou). No Cloudflare nenhum Worker lê variável do Pinta. Não há nada a apagar; se alguém
as criar por engano, o código as ignora:

`NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1`, `PINTA_CAUSAL_CANDIDATE`, `PINTA_PALETTE_WRITE_CANDIDATE`,
`PINTA_CAUSAL_QA_PROFILES`, `PINTA_WORKSHOP_SERVICE_READER`, `STUDIO_SEALED_PARTS_CANDIDATE`,
`STUDIO_SEALED_QA_PROFILES`.

Os roteiros antigos de QA em `docs/pinta-cenarios/missao-completa-2026-11-18/qa/` (probes de 22/11)
ainda citam as variáveis; são registro histórico e não rodam no CI.

## Pendências

- Na promoção à produção, todo perfil passa a adotar a nuvem causal na primeira abertura do Pinta
  (backfill desenho por desenho). Acompanhar a fila de adoção nos primeiros dias.
- Suporte em modo leitura continua sem o escopo: abre o caminho antigo, que um perfil causal recusa.
  Ler pela fila causal em modo leitura é trabalho à parte.
- Nativo 9 / nuvem 8: etapa 8 (sobe `PINTA_INVENTORY_READER_VERSION` no core).
- Fora deste lote: na suíte inteira do `community-kids`, 15 testes de `studio-pro-editor`,
  `studio-profile-switch` e `studio-python-remix` falham também na staging pura (`e0b0887cc`, 1736
  pass / 15 fail) e passam isolados (18/0). Estado vazando de um arquivo anterior; é da frente do
  Estúdio.
