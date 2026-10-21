# Candidata `python-browser/2026-10-21-audio-2` (publish + assist)

Preparação **offline**. Nenhum upload, deploy, variável Railway, ponteiro do Worker ou
aprovação operacional foi gerado. A release piloto `2026-10-20-audio-1` (manifesto
`7026b09b…`) não foi alterada: capacidades não podem crescer sob o mesmo hash.

Esta versão substitui a primeira preparação da candidata (distribuição `a8a6c625…`, manifesto
`0c6c06c4…`, plano `88a4e71c…`), que nunca foi promovida nem ativada: o runtime Turtle mudou
em `f81fd9ae2`.

## O que muda em relação ao piloto

- Distribuição nova `542cc5022b3ee51b1ae6ead777b91dbf06319402b6c008e1a3c47f927b66aadf`
  (41 arquivos), construída com o builder canônico. Em relação a `a8a6c625…` mudaram só:
  - `turtle-renderer.mjs` (15.872 → 16.010 B, `1df132c0…` → `cdf09259…`);
  - `turtle/_sz_turtle_backend.py` (18.183 → 18.788 B, `666ae2dd…` → `6562b2a5…`);
  - a representação gzip de `turtle-renderer.mjs` (`_http/gzip/bcba1392….gz` →
    `_http/gzip/ee343143….gz`).
  Os outros 38 arquivos e os campos do manifesto da distribuição são idênticos.
- `releaseId`: `2026-10-21-audio-2`.
- Capacidades: `edit`, `export-source`, `execute`, `python-repl`, **`publish`**, **`assist`**
  (sem `pause`, como no piloto).
- Manifesto `8f876d00e1dab31dde6aa57548b9e897e9e26be0137d5c90c93360e793518515`, logo prefixo
  `runtimes/8f876d00…/` e marcador `204dba07…`. Os 43 objetos precisam ser promovidos sob esse
  prefixo (é uma release semanticamente nova, não um replay do R7).

## Como foi gerado

1. Distribuição (Bun 1.3.11, a partir da raiz, com `vendor/` e `prepared-stdlib/` copiados de
   `sistema-zero-studio-python/.cache/studio-python-runtime/` para o `.cache` do checkout; nada
   foi baixado):

   ```sh
   bun packages/studio/scripts/build-python-runtime.ts
   ```

   A saída foi copiada, sem alteração, para
   `C:/Users/julio/projects/sistema-zero-studio-python/.cache/studio-python-runtime/distributions-transfer/542cc5022b3ee51b1ae6ead777b91dbf06319402b6c008e1a3c47f927b66aadf`.
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

   Resultado: plano `deb6a0028178ba96e8f4660da740d7a292ccb6fc0c5236aba84599398f369ee1`,
   reconferido com `verifyPythonPromotionPlan`; catálogo do Worker `57823cd1…`. O SHA do plano
   inclui o caminho local da distribuição; em outra máquina, regenere com o caminho de lá.
5. `staging/*.json` são as projeções públicas do plano; `preparation-receipt.json` fixa os
   hashes de todos os arquivos e o diff da distribuição.

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
   `workerName` `sistemazero-python-promoter-staging-deb6a0028178`), depois:

   ```sh
   bun --no-env-file packages/studio-runtime/scripts/promote-python-runtime-worker.ts prepare \
     --plan docs/superpowers/plans/2026-10-21-python-audio-2-candidate/canonical-plan.json \
     --expect-plan-sha256 deb6a0028178ba96e8f4660da740d7a292ccb6fc0c5236aba84599398f369ee1 \
     --approval APPROVAL.json --expect-approval-sha256 APPROVAL_SHA --out NOVO_DIRETORIO_EXCLUSIVO
   ```

   Deploy do promotor finito com Wrangler 4.120.1, segredo HMAC dedicado, POST assinado,
   readback dos 43 objetos e revogação de segredo, tail e Worker (README do `promotion-worker`).
3. **Worker público de staging**: deploy revisado com `--keep-vars` e os dois valores de
   `staging/worker-bindings.json` (`STUDIO_PYTHON_DISTRIBUTIONS_SHA256=57823cd1…`).
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
