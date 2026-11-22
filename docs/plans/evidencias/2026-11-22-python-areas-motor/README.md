# Motor Python `2026-11-22-areas-1` (staging, preparado e NÃO implantado)

Versão nova do motor Python e da lista de blocos aprovados, uma vez só, com as três frentes:
as áreas do projeto (bloco "repetir a cada" do Turtle, `sz_py_turtle_every`), as regiões do
Raylib 3D (`sz_py_rl3d_scene_load`, `_update`, `_draw`, `_entered`; recurso
`molda-scene-regions-v1`) e os cenários do Pinta (já na release anterior).

## O que foi feito (22/11/2026, só local)

- **Distribuição**: a Linux qualificada pelo CI `studio-runtime-image.yml` no commit
  `b089d589ea027dab5d29552ab6edf0bbefe9aa43` (run 45072470079, artefato
  `studio-runtime-image-b089d589…`), distribuição `f3b6ef00c982d522c51be2d7dbe31a919d3bc7a5c85a5d4ae32fc674c4e0eef0`
  (126 arquivos, 26 MB). Lida do zip por leitura parcial, só `python/` e os recibos; o
  `validation-profile.json` do artefato é idêntico ao da staging local. Depois de `b089d589e`,
  nada do motor mudou (só a contagem de um teste). Fica em
  `.cache/lote8-linux/python/f3b6ef00…` desta máquina.
- **Baseline**: a `configuration` do plano do Pinta
  (`docs/pinta-cenarios/missao-completa-2026-11-18/qa/leitor-linux-598-2026-11-21/plano-promocao.json`),
  conferida contra o commitado: seletor de staging `fa8847d2…` e catálogo do Members `12220f13…`
  (o mesmo conteúdo). Produção não muda.
- **Plano** (`promote-python-runtime.ts prepare`): `plano-staging.json`, planSha256
  `41e4a42a0235ed2d208be109e2aeee9f37c7d0460d733f65e0a7612cb8b0665d`, manifesto da release
  `c74c1500a32ee8fa58999937bceb685daf6c54f556a331ff95b9fc0ef9b2ec47`, configuração
  `c3274e8765beb2b2ef9d6cd847dee51ee5da423f314bc3e4b6fc80f6a5e52e83`. Os arquivos daqui foram
  formatados pelo biome; a verificação do `upload` (`verifyPythonPromotionPlan`) passou com eles.
- **Release nova ativa**, a `2026-11-20-pinta-cenarios-6` vira `retired` no Worker e no Members
  (as outras três seguem guardadas). 703 blocos aprovados: os 698 da anterior mais os cinco
  acima; nenhum sai.
- **Members**: catálogo `01c079c1b34563d23b93c57d4ad88eb3b932fd5de75ef699675d254ec6729eee.json`
  (191.810 bytes), gerado como o anterior (`canonicalJson` indentado e formatado pelo biome; o
  mesmo caminho reproduz o `12220f13…` byte a byte) e empacotado pelo comando oficial;
  `studio-policy-configuration.test.ts` verde.
- **Worker**: seletor de staging `STUDIO_PYTHON_DISTRIBUTIONS_SHA256` =
  `1dd32fdc910646a12416c1f16fa12ee87e4a3d3f5c08bd825c79ba365ea0afb4`, em commit próprio.

## Para implantar (quem implanta; nada disto foi feito)

1. R2 de staging: `bun packages/studio-runtime/scripts/promote-python-runtime.ts upload --plan
   docs/plans/evidencias/2026-11-22-python-areas-motor/plano-staging.json --expect-plan-sha256
   41e4a42a0235ed2d208be109e2aeee9f37c7d0460d733f65e0a7612cb8b0665d` (lê a distribuição em
   `.cache/lote8-linux`).
2. Worker de staging com o seletor `1dd32fdc…` (o commit do `wrangler.jsonc`).
3. Os apps.
4. Members por último: `STUDIO_AUTHORING_POLICY_SHA256=01c079c1…` e `STUDIO_RUNTIME_HOSTS_JSON` =
   `configuration.hosts` do plano (quatro releases, todas no Worker de staging), pela ordem de
   `docs/operations/studio-authoring-catalog.md`.
5. Até a troca, os 20 exemplos de blocos do Turtle e os blocos de região do Raylib 3D são
   recusados pela release de agora (o catálogo dela não os tem).

Produção pede o baseline lido por ela (sem imprimir segredos) e o mesmo `manifestSha256`.
