# Motor Python `2026-11-22-areas-1` (staging: no R2 desde 23/11/2026)

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

## Envio ao R2 de staging (23/11/2026, feito a pedido dela)

Pelo serviço temporário (`promotion-worker/`), o mesmo caminho das promoções do Pinta de 20 e
21/11, com a fonte do promotor intacta desde `c9d70dfc8`:

- **Qualificação** (`qualificacao.json`, SHA-256 `31a4ce59…`): as famílias Pygame-ce (22) e
  Raylib (26) passaram no Chrome servidas por ESTA distribuição Linux; os 110 arquivos lógicos são
  os da distribuição local `1b9e2813…` dos e2e de 22/11 (só os 16 gzip e o fim de linha de uma
  licença mudam).
- **Aprovação** (`aprovacao-operacional.json`, janela de 29 minutos) e artefato `fd3355a1…`
  (`operationalSha256` `6cd8570a…`), frame de 26.005.469 bytes (o já medido era 26.007.007).
- **Envio** (`upload-r2.json`): HTTP 200 em 48 s, estado `complete`, 126 arquivos e 128 objetos
  lidos de volta com o SHA-256 nativo, nenhuma falha, nada ativado. O serviço recusou pedido sem
  assinatura (401) e tinha só o bucket de staging, a chave e o metadado de versão
  (`servico-temporario.json`).
- **Limpeza** (`limpeza.json`): serviço apagado e ausência confirmada; a chave temporária local
  apagada; os objetos imutáveis ficam.
- **Leitura independente pela CLI** (`leitura-r2.json`): marcador, catálogo `1dd32fdc…`,
  `playtest.mjs` e `standalone.mjs` batem com o plano.
- O verificador do Worker da staging local (com a integração do Pinta, que soma o recurso
  `pinta-scene-regions-v1`) aceita o catálogo `1dd32fdc…` inteiro.

## Ativação no staging (23/11/2026, feita)

1. R2 de staging: acima.
2. **Worker de staging** com o seletor `1dd32fdc…` (`06d7533f9`): `bun run deploy:staging` da
   staging local (`06d7533f9`, com a integração do Pinta ainda sem push), versão
   `087cca4a-c3e7-486b-b5a8-3bac014219b8`; os contêineres foram reconstruídos para o perfil de
   validação da staging local. `/healthz` 200; `/v1/runtime-deployments/` da release nova e da
   `pinta-cenarios-6` (agora `retired`) respondem 200; o `standalone.mjs` servido bate com o plano.
3. **Apps**: sem deploy novo (já tinham os blocos novos desde o deploy de `abc47abbe`).
4. **Members** (implantado em `21b467bd6`, que traz o catálogo `01c079c1…`): a base conferida
   (política `12220f13…`, os três hosts do plano, sem `STUDIO_AUTHORING_POLICY_JSON`);
   `variable set --skip-deploys` da política `01c079c1…` e dos quatro hosts de
   `configuration.hosts`, relidos iguais ao plano; redeploy `e0b239ca` SUCCESS, servidor no ar.
   Falta a conferência logada (abrir um exemplo de blocos do Turtle com o "repetir a cada").

⚠️ Enquanto o `06d7533f9` não chega ao `origin`, o `wrangler.jsonc` de lá aponta o `fa8847d2…`:
um deploy do Worker feito a partir do `origin` voltaria o seletor e deixaria a release que o
Members anuncia fora do Worker. A próxima release (a do Pinta) parte desta base: Worker
`1dd32fdc…`, Members `01c079c1…`.

**Rollback**: no Members, a política `12220f13…` e os três hosts anteriores juntos (com
`--skip-deploys`) e redeploy; depois o Worker com o seletor `fa8847d2…`.

Produção pede o baseline lido por ela (sem imprimir segredos) e o mesmo `manifestSha256`.
