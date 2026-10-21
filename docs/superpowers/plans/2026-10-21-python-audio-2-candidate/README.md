# Candidata `python-browser/2026-10-21-audio-2` (publish + assist)

Preparação **offline**. Nenhum upload, deploy, variável Railway, ponteiro do Worker ou
aprovação operacional foi gerado. A release piloto `2026-10-20-audio-1` (manifesto
`7026b09b…`) não foi alterada: capacidades não podem crescer sob o mesmo hash.

## O que muda em relação ao piloto

- Mesma distribuição `a8a6c625…` (41 arquivos, 22.407.495 B), sem novo build.
- `releaseId`: `2026-10-21-audio-2`.
- Capacidades: `edit`, `export-source`, `execute`, `python-repl`, **`publish`**, **`assist`**
  (sem `pause`, como no piloto).
- Novo manifesto `0c6c06c407713217571ebda57a78d92f102c1d0457a2965d64cd6f66c1e82fae`, logo novo
  prefixo `runtimes/0c6c06c4…/` e novo marcador `a202bcb8…`. Os 43 objetos precisam ser
  promovidos de novo sob esse prefixo (é uma release semanticamente nova, não um replay do R7).

## Como foi gerado

1. `input.json` = `0375-input.json.snapshot` do piloto (baseline observado `40ce822a…`, Members
   ausente, hosts `[]`), trocando só `releaseId`, `capabilities` e o diretório local da cópia
   da distribuição `a8a6` (`sistema-zero-studio-python/.cache/studio-python-runtime/distributions-transfer/`).
2. Controle: o mesmo comando sobre o input do piloto reproduziu o manifesto `7026b09b…`, o
   catálogo do Worker `2dc37fc2…` e o marcador `798c39e2…`; as quatro projeções `staging/`
   do piloto foram reproduzidas byte a byte com o método usado aqui (`canonicalJson(valor) + "\n"`).
3. Comando (Bun 1.3.11, a partir de `packages/studio-runtime`):

   ```sh
   bun --no-env-file scripts/promote-python-runtime.ts prepare \
     --input ../../docs/superpowers/plans/2026-10-21-python-audio-2-candidate/input.json \
     --out ../../docs/superpowers/plans/2026-10-21-python-audio-2-candidate/canonical-plan.json
   ```

   Resultado: plano `88a4e71c0e8d3d33bbe667fae71f6e7be397e529b181d5b50a298292ac414ea2`,
   reconferido com `verifyPythonPromotionPlan`. O SHA do plano inclui o caminho local da
   distribuição; em outra máquina, regenere com o caminho de lá.
4. `staging/*.json` são as projeções públicas do plano; `preparation-receipt.json` fixa os
   hashes de todos os arquivos.

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
   `workerName` `sistemazero-python-promoter-staging-88a4e71c0e8d`), depois:

   ```sh
   bun --no-env-file packages/studio-runtime/scripts/promote-python-runtime-worker.ts prepare \
     --plan docs/superpowers/plans/2026-10-21-python-audio-2-candidate/canonical-plan.json \
     --expect-plan-sha256 88a4e71c0e8d3d33bbe667fae71f6e7be397e529b181d5b50a298292ac414ea2 \
     --approval APPROVAL.json --expect-approval-sha256 APPROVAL_SHA --out NOVO_DIRETORIO_EXCLUSIVO
   ```

   Deploy do promotor finito com Wrangler 4.120.1, segredo HMAC dedicado, POST assinado,
   readback dos 43 objetos e revogação de segredo, tail e Worker (README do `promotion-worker`).
3. **Worker público de staging**: deploy revisado com `--keep-vars` e os dois valores de
   `staging/worker-bindings.json` (`STUDIO_PYTHON_DISTRIBUTIONS_SHA256=2c3e47b8…`).
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
