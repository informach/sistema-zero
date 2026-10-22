# Candidata `python-browser/2026-10-21-audio-2` (publish + assist)

Preparação **offline**. Nenhum upload, deploy, variável Railway, ponteiro do Worker ou
aprovação operacional foi gerado. A release piloto `2026-10-20-audio-1` (manifesto
`7026b09b…`) não foi alterada: capacidades não podem crescer sob o mesmo hash.

Esta versão substitui a preparação anterior da candidata (distribuição `542cc502…`, manifesto
`8f876d00…`, plano `deb6a002…`), que nunca foi promovida nem ativada: o renderer Turtle passou
a reter camadas em `e1c5fb092`. A primeira preparação (distribuição `a8a6c625…`, manifesto
`0c6c06c4…`, plano `88a4e71c…`) também nunca foi promovida.

## O que muda em relação ao piloto

- Distribuição nova `65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c`
  (41 arquivos), construída com o builder canônico a partir de `e1c5fb092`. Em relação a
  `a8a6c625…` (piloto) mudaram só:
  - `turtle-renderer.mjs` (15.872 → 17.126 B, `1df132c0…` → `a63a3802…`);
  - `turtle/_sz_turtle_backend.py` (18.183 → 18.788 B, `666ae2dd…` → `6562b2a5…`);
  - a representação gzip de `turtle-renderer.mjs` (`_http/gzip/bcba1392….gz` →
    `_http/gzip/17d3965c….gz`).
  Em relação a `542cc502…` mudaram só `turtle-renderer.mjs` e o gzip dele
  (`ee343143….gz` → `17d3965c….gz`). Os demais arquivos e campos do manifesto da
  distribuição são idênticos.
- `releaseId`: `2026-10-21-audio-2`.
- Capacidades: `edit`, `export-source`, `execute`, `python-repl`, **`publish`**, **`assist`**
  (sem `pause`, como no piloto).
- Manifesto `1c9112c4cb533481abc5b8bc47a2a60e5b012b4a2e084317e52f2bad9dd01d36`, logo prefixo
  `runtimes/1c9112c4…/` e marcador `443145f9…`. Os 43 objetos precisam ser promovidos sob esse
  prefixo (é uma release semanticamente nova, não um replay do R7).

## Como foi gerado

1. Distribuição: `bun packages/studio/scripts/build-python-runtime.ts` (Bun 1.3.11) em
   `e1c5fb092`, com os artefatos fixados do `.cache` e sem download. A saída está, sem
   alteração (conferida com `diff -r`), em
   `C:/Users/julio/projects/sistema-zero-studio-python/.cache/studio-python-runtime/distributions-transfer/65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c`.
   Esta preparação não reconstruiu a distribuição; o preparador reconfere cada arquivo por
   tamanho e SHA-256.
2. `input.json` = `0375-input.json.snapshot` do piloto (baseline observado `40ce822a…`, Members
   ausente, hosts `[]`), trocando só `releaseId`, `capabilities` e a distribuição.
3. Controle: o mesmo comando sobre o input do piloto (distribuição `a8a6`) continua
   reproduzindo o manifesto `7026b09b…`, o catálogo do Worker `2dc37fc2…` e o marcador
   `798c39e2…`; as projeções `staging/` usam o método que reproduz as do piloto byte a byte
   (`canonicalJson(valor) + "\n"`).
4. Comando (a partir de `packages/studio-runtime`):

   ```sh
   bun --no-env-file scripts/promote-python-runtime.ts prepare \
     --input ../../docs/superpowers/plans/2026-10-21-python-audio-2-candidate/input.json \
     --out ../../docs/superpowers/plans/2026-10-21-python-audio-2-candidate/canonical-plan.json
   ```

   Resultado: plano `019dfa8e49583f337136f499f77380151b5b2bc6193d9ec07fc8bed4bf15e195`,
   reconferido com `verifyPythonPromotionPlan`; catálogo do Worker `2cfcc37b…`, configuração
   `359e3df7…`. O SHA do plano inclui o caminho local da distribuição; em outra máquina,
   regenere com o caminho de lá.
5. `staging/*.json` são as projeções públicas do plano; `preparation-receipt.json` fixa os
   hashes de todos os arquivos e os diffs da distribuição.

Atenção: com o baseline do piloto, a configuração do Worker resultante contém
`2026-10-19-1` + `2026-10-21-audio-2`, **sem** `audio-1` (que nunca foi ativada). Se o
piloto for ativado antes, gere de novo a partir do baseline real, que já terá `audio-1`; o
preparador é aditivo e mantém as duas.

## Para ativar (fora deste lote; exige Cloudflare e Railway)

1. **Baseline fresco** (somente leitura): Worker ativo e configuração R2 de staging,
   `STUDIO_AUTHORING_POLICY_JSON` / `STUDIO_RUNTIME_HOSTS_JSON` do Members e as listas de
   frame dos apps, conforme o plano de ativação do piloto. Se algo divergir de
   `input.json.baseline`, regenere `input.json` e o plano.
2. **Aprovação operacional** revisada pelo root (`OperationalApprovalSchema`, janela ≤ 30 min,
   `workerName` `sistemazero-python-promoter-staging-019dfa8e4958`), depois:

   ```sh
   bun --no-env-file packages/studio-runtime/scripts/promote-python-runtime-worker.ts prepare \
     --plan docs/superpowers/plans/2026-10-21-python-audio-2-candidate/canonical-plan.json \
     --expect-plan-sha256 019dfa8e49583f337136f499f77380151b5b2bc6193d9ec07fc8bed4bf15e195 \
     --approval APPROVAL.json --expect-approval-sha256 APPROVAL_SHA --out NOVO_DIRETORIO_EXCLUSIVO
   ```

   Deploy do promotor finito com Wrangler 4.120.1, segredo HMAC dedicado, POST assinado,
   readback dos 43 objetos e revogação de segredo, tail e Worker (README do `promotion-worker`).
3. **Worker público de staging**: deploy revisado com `--keep-vars` e os dois valores de
   `staging/worker-bindings.json` (`STUDIO_PYTHON_DISTRIBUTIONS_SHA256=2cfcc37b…`).
4. **Members (Railway)**: as duas escritas de `staging/railway-write-plan.json` via `--stdin
   --skip-deploys`, com conferência de ausência/igualdade imediatamente antes e readback depois.
   O Members implantado precisa conter este branch (Members resolve `publish`/`assist`); a BFF
   (community, community-kids) também, para exigir as capacidades.
5. Gates: publicar Python (livre, aula, oficina) e jogar anonimamente; Zappy Python; negativos
   com uma release sem `publish`/`assist`; controles JS Classic/Pro inalterados.

**Ordem e reversão.**
- O Worker do runtime (`studio-runtime`) que grava a receita de publicação v2 (merge `eb9069254`) sobe com `wrangler deploy` atômico, nunca em implantação gradual (`wrangler versions`).
- Depois que existir uma revisão Python publicada em v2, não se faz rollback do Worker para uma versão anterior a esse merge: o leitor antigo só aceita v1 e devolveria 409 para essas publicações.
- Members e BFFs sobem juntos, antes de ativar esta release. Um BFF antigo recusa a decisão `live-publication` com `publish`.

Produção continua fora de escopo: baseline e plano próprios, sem reaproveitar este SHA.
