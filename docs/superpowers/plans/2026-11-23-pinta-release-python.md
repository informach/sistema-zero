# Motor Python: a versão única que leva os cenários do Pinta (preparação, 23/11/2026)

**Situação:** preparada e provada só localmente. Nenhuma release foi gerada, nada subiu ao R2, nenhum
Worker ou Members foi implantado e nenhuma variável remota mudou.

**Decisão da dona (aprovada):** a versão do motor Python sai uma só, junto com as frentes Áreas do
Python e Evolução do Estúdio. Quem fechar por último gera a versão, e os jogos gravados são
conferidos uma vez só.

**Base:** a release ativa no staging, `2026-11-22-areas-1`, com o Worker no seletor `1dd32fdc…` e o
Members no catálogo `01c079c1…`. O caminho seguido é o do
[README do motor das Áreas](../../plans/evidencias/2026-11-22-python-areas-motor/README.md).

## 1. O que a release acrescenta sobre a `2026-11-22-areas-1`

Na `areas-1`, a frase "cenários do Pinta já na release anterior" vale só para os leitores antigos
(`pinta-map-world-v1` e `pinta-scene-physics-v1`, PNG 1–4). Nada das regiões está ativo hoje. Os
fatos abaixo foram conferidos no catálogo `01c079c1…`:

- não existe o recurso `pinta-scene-regions-v1`;
- não existe nenhum dos três módulos `pinta-scenes/*`;
- não existe nenhum dos 27 blocos;
- não existe a categoria "Cenários do Pinta".

| Peça | O que entra | Onde mora |
|---|---|---|
| Recurso | `pinta-scene-regions-v1` | `PYTHON_PINTA_REGIONS_FEATURE` em `packages/core/src/studio/python-runtime-features.ts` |
| Módulo | Um `pinta.py` por extensão 2D: `pinta-scenes/pygame/pinta.py`, `pinta-scenes/pgzero/pinta.py` e `pinta-scenes/raylib-2d/pinta.py` (ver os detalhes abaixo) | `buildPythonPintaScenesModule` em `packages/studio/src/runtime/python/pintaScenesModule.ts` e as fontes em `packages/pinta/src/export/python*` |
| Blocos | 27 IDs, na categoria nova "Cenários do Pinta" (lista abaixo) | `packages/studio/src/python/extensions/pintaScenes.ts` (`pintaSceneCodecs`) |
| Catálogo aprovado | A lista passa de 703 para 730 blocos e de 56 para 57 categorias. Nenhum bloco sai, e os 16 `sz_py_pygame_pinta_*` anteriores ficam | gerada pelo plano de promoção |
| Members | Um catálogo novo, `studio-authoring-catalogs/<sha>.json`, com a release nova. A `areas-1` passa a `retired`, e as outras ficam guardadas | `packages/members/src/infrastructure/config/` |
| Worker | Seletor novo de staging (`STUDIO_PYTHON_DISTRIBUTIONS_SHA256`) | `packages/studio-runtime/wrangler.jsonc`, env `staging` |

**Detalhes dos módulos:**

- teto de 256 KiB por arquivo (`PYTHON_PINTA_SCENE_MODULE_MAX_BYTES`);
- o worker confere o SHA de cada módulo antes de montar o projeto;
- um arquivo autoral com o mesmo nome continua com precedência;
- a distribuição só é aceita com os três módulos quando declara o recurso, e sem nenhum quando não
  declara (`python-runtime-distribution.ts`).

**Os 27 blocos.** São 9 operações em cada extensão. Os prefixos são `sz_py_pygame_`, `sz_py_pgzero_`
e `sz_py_rl2d_`. O sufixo é `pinta_scene_` seguido de uma destas chaves: `load`, `draw`, `start`,
`objects`, `property`, `open_door`, `blocked`, `landing` ou `dispose`. Todos são comandos ou valores
de nível 2 nas categorias das próprias extensões. Não há chapéu novo e `areas.ts` não muda.

**O que muda no motor sem os cenários.** Montei localmente a distribuição base (sem `pintaScenes`) e
a comparei com os artefatos da `areas-1`. Dos 110 arquivos lógicos, 12 diferem:

- `worker.mjs`, `frame.mjs`, `standalone.mjs`, `playtest.mjs` e `inspect.mjs`;
- `pgzero-renderer.mjs`, `pgzero-protocol.mjs`, `raylib-renderer.mjs` e `raylib-protocol.mjs`;
- `pgzero/pgzero/_sz.py`, `raylib/_szraylib/_rt.py` e o `pygame/pinta.py` antigo.

Com `pintaScenes` ligado, o `worker.mjs` muda de novo, porque leva os SHAs dos três módulos, e entram
os três arquivos novos. As mudanças vêm da integração do Pinta de 22 e 23/11. A lista exata sai de
`git log b089d589e..<fonte> -- packages/studio/src/runtime/python packages/pinta/src/export
packages/core/src/studio`. Os principais commits são:

- `e5d2cc6d9`, `fc97a2620` (que mexe no `pygame/pinta.py` antigo), `34d9c0a8d`, `95567ef3c`;
- `1d728d44a`, `c34117d6a`, `aef073ff1`, `a4542f356`, `b41bd950a`, `3d3ece121`, `fda28ff68`;
- `55b85a1a0`, `baf000e19`, `a730f1dc1`, `bf6faf24d`;
- o lote R2 do review: `6fc1231cd`, `72bdc9cd2`, `7452b4434` e `56875ac6a`.

Como mudam renderizadores e bundles comuns, todas as famílias de jogos precisam ser requalificadas,
não só as que usam cenários.

**SHAs da montagem local deste lote.** A fonte do runtime é igual à de `1f5a86418`; os commits deste
lote não mexem no runtime. A montagem é Windows; a do CI é Linux e muda só os 16 gzip.

| Distribuição | SHA | Arquivos | Recursos |
|---|---|---|---|
| Candidata com `pintaScenes` | `8c50cabcebad39316570f9bbab622b28307ec93940c262e47393fd7ced88c95a` | 129 | os da `areas-1` mais `pinta-scene-regions-v1` |
| Base sem cenários | `1ddfa7bd95daa705f304e16e4567d08ada4c4ac2447418c695f163ffbd3a53a1` | 126 | os da `areas-1` |

Os três módulos novos da candidata:

| Módulo | Bytes | SHA-256 |
|---|---:|---|
| `pinta-scenes/pygame/pinta.py` | 197.032 | `0fdf31db87f0cec7c587728a33ed2ebd0be4e5835570254189dcf7d43d716acc` |
| `pinta-scenes/pgzero/pinta.py` | 114.595 | `21d9fb1577fd9c0c8224a19f61ce5d7f1c159308e28cfb995024b0a8f6fd0111` |
| `pinta-scenes/raylib-2d/pinta.py` | 114.899 | `670e9bc2c7ceb4bc654f9eac62562e2d69064796717bd4673959140cc0cb261a` |

## 2. Consertos feitos neste lote para a release sair certa

- **`1f5a86418`, plano de promoção.** `python-promotion-plan.ts` aprovava só os
  `PYTHON_*_CODECS`. Os 27 blocos moram em `PYTHON_*_PINTA_SCENE_CODECS`. Por isso, uma release com o
  recurso sairia com o módulo e zero blocos de cenário aprovados, e o editor os esconderia. O teste
  novo usa os recursos da `areas-1` e mostra que somar o recurso acrescenta exatamente os 27 e a
  categoria, sem tirar nada. Também conferi à parte que os codecs de hoje reproduzem os 703 IDs e
  as 56 categorias do `01c079c1…`.
- **`4e3fbeef9`, requalificação.** `requalify-gallery.ts` montava a autoria do Pygame Zero e do Raylib
  2D sem os blocos de cenário, que o editor põe na frente (`loadPythonAuthoring`). Agora usa a mesma
  lista do editor. Numa release sem o recurso, `orderPythonAuthoringCodecs` os filtra, então os
  recibos atuais não mudam.

## 3. O que a release precisa ligar: o build qualificado

O CI da imagem (`.github/workflows/studio-runtime-image.yml`, passo "Preparar distribuição
hermética") roda `bun packages/studio/scripts/build-python-runtime.ts`. A entrada desse script chama
`buildPythonRuntimeDistribution()` **sem** `pintaScenes`. A `areas-1` saiu assim, e é por isso que
ela não tem o recurso.

**Passo da release:** no commit-fonte da versão única, a entrada do script (ou o passo do workflow)
passa a construir com `{ pintaScenes: true }`. Isso não foi mudado neste lote, porque é a decisão de
quem gera a versão, com as outras frentes. Os ensaios nativos que o CI roda nessa etapa
(`python-mission-smoke`, `python-playtest-smoke`) passam a correr sobre a distribuição com cenários.

## 4. O que depende das outras frentes

- **Evolução do Estúdio** (`docs/estudio-evolucao/entrega-final.md`, pendências): "Python:
  `entrou_na_regiao` consome a entrada na primeira leitura (E9) | exige uma versão nova do motor
  Python | a próxima versão do motor". Não está corrigido na staging local de hoje; o último commit
  no `cenario.py` é `b03aac268`.
- **Mundos de 2 km** (`docs/plans/2026-11-23-mundos-de-2km.md`, lote 6). Traz um leitor v2 no
  `cenario.py` e o recurso novo `molda-scene-relevo-v1`. Está marcado como "uma versão só do motor…
  combinada com a frente do Pinta". Os lotes 0 a 2 já estão na staging local (`6bb84d96f`,
  `7f5ca68de`, `5605c9d99` e `0fc69bc92`), e o lote 6 ainda não.
- **Áreas do Python:** já estão na `areas-1`. Se a frente acrescentar blocos, eles entram pela mesma
  geração, porque o plano aprova o que os codecs e os recursos da distribuição admitem.
- **Ordem:** quem fechar por último monta a fonte com as três frentes e roda tudo abaixo uma vez. Se
  E9 e o lote 6 entrarem, somam-se ao "acrescenta" da seção 1: as mudanças do `cenario.py` e o
  recurso `molda-scene-relevo-v1`.

## 5. Jogos e recibos a conferir de novo (inventário real em `HEAD`)

Todos os recibos visuais atuais foram qualificados contra a release de prova
(`python-probe/probe-1`), com os recursos da `areas-1`. O recurso novo muda
`authoringRuntimeFeatures` em **todos** eles. Nos 58 + 9 mudam também `codecOrderSha256` e
`approvedBlockIdsSha256`, porque os 9 blocos de cenário entram na autoria daquelas extensões. Logo, o
`--check` atual falha em todos, e a requalificação é completa.

| Família | Quantidade | Como conferir | Onde ficam |
|---|---:|---|---|
| Turtle (jogos visuais) | 20 | `scripts/python/requalify-gallery.ts` | `docs/continuity/2026-10-22-python-reference-games-visual-evidence` |
| Pygame Zero | 58 (recibos r9 hoje) | `requalify-gallery.ts --extensions python-pgzero` e `playwright.python-pgzero.config.ts` | `docs/continuity/2026-10-24-python-pgzero-games-evidence` |
| Raylib 2D | 9 | `requalify-gallery.ts --extensions python-raylib-2d` e `playwright.python-raylib.config.ts` | `docs/continuity/2026-10-24-python-raylib-games-evidence` |
| Raylib 3D | 8 | os mesmos comandos, com `python-raylib-3d` | a mesma pasta |
| Pygame-ce | 9 jogos, nas formas blocos e código (18 exemplos) | `scripts/python/pygame-block-coverage.ts --check` e `playwright.python-pygame.config.ts` | `src/examples/python/pygameGames.blocks.generated.ts` |
| Cenários do Pinta | 22 casos | `playwright.pinta-python-2d-browser.config.ts` (16) e `playwright.pinta-python-regional.config.ts` (6) | ensaio, sem recibo versionado |
| Cursos gravados | as três provas | ver a lista abaixo | regras da missão |

**As três provas dos cursos gravados:**

- `bun test docs/aulas-interativas-tecnico/qa`;
- `protected-lessons.spec.ts`;
- `bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts`.

**Já ensaiado neste lote, sobre a candidata local `8c50cabc…` e o Bun 1.4.4 do servidor de provas:**

- cenários do Pinta: 22 de 22 no Chrome e no Chromium. Cobrem os seguintes casos:
  - Pygame-ce regional 1× e 2× em Wasm real;
  - a recusa do módulo adulterado antes do código da criança;
  - os compositores do Pygame Zero e do Raylib 2D;
  - PNG comum e Raylib só 3D;
  - os dois motores JS com PNG 5, no Clássico e no Pro;
- `playwright.python-pygame.config.ts` completo: 43 de 44. Inclui os 9 jogos, mundos e física do
  Pinta antigos e o foco de fundo. A única falha foi o teste de desempenho no Chromium (40,7 fps,
  mínimo 45; o Chrome deu 59,9). Repetido 3 vezes, a candidata passou nas três (59,8, 52,8 e 50,8
  fps). A distribuição da `areas-1` falhou numa das três (42,7, 52,0 e 56,9). É ruído de máquina
  carregada, não regressão.

## 6. Passo a passo da promoção (o mesmo caminho da `areas-1`)

**0. Fonte.** É a staging local com as três frentes. Antes de seguir:

- typecheck e testes;
- as três provas dos cursos;
- a seção 3 ligada.

**1. CI da imagem.** Rodar `studio-runtime-image.yml` no commit-fonte. Do artefato
`studio-runtime-image-<sha>`:

- ler do zip, por leitura parcial, só `python/<hash>/` e os recibos;
- conferir que o `validation-profile.json` é igual ao da staging local;
- conferir que nada do motor mudou depois do commit qualificado.

**2. Baseline.** Ler a configuração de staging, sem imprimir segredos. Ela deve ser: Worker
`1dd32fdc…`, Members `01c079c1…` e os hosts atuais. Produção não muda.

**3. Plano.** Rodar `bun packages/studio-runtime/scripts/promote-python-runtime.ts prepare` com uma
entrada no molde de `entrada-staging.json` da `areas-1`:

- ambiente `staging`;
- diretório e SHA da distribuição Linux;
- `releaseId` novo, por exemplo `2026-11-2X-pinta-regioes-1`;
- as mesmas capacidades;
- o baseline do passo 2.

Conferir no plano:

- 730 blocos, os 27 a mais e "Cenários do Pinta";
- nenhum bloco a menos;
- `areas-1` como `retired`;
- `planSha256`, `manifestSha256` e o SHA da configuração anotados;
- `verifyPythonPromotionPlan` passando com os arquivos formatados.

**4. Qualificação** (`qualificacao.json`). Servir a distribuição Linux exata no servidor de provas
(Bun ≥1.4 no Windows) e rodar no Chrome:

- as famílias Pygame-ce, Raylib, Pygame Zero e Cenários do Pinta;
- a requalificação dos 95 recibos visuais (20 + 58 + 9 + 8);
- o `pygame-block-coverage --check`.

Os recibos novos são versionados num commit próprio, antes do envio.

**5. Members (catálogo).** Gerar `studio-authoring-catalogs/<sha>.json` como o anterior: `canonicalJson`
indentado e formatado pelo biome. Empacotar pelo comando oficial e rodar
`studio-policy-configuration.test.ts` verde.

**6. Worker (seletor).** Atualizar `STUDIO_PYTHON_DISTRIBUTIONS_SHA256` do env `staging` em
`packages/studio-runtime/wrangler.jsonc`, num commit próprio.

**7. R2 de staging.** Usar o serviço temporário (`promotion-worker/`), a pedido dela, como em 20, 21
e 23/11:

- aprovação operacional, com janela curta;
- envio: conferir HTTP 200, estado `complete` e os objetos lidos de volta com o SHA nativo;
- limpeza: serviço apagado, ausência confirmada e chave temporária local apagada;
- leitura independente pela CLI: marcador, catálogo, `playtest.mjs` e `standalone.mjs`.

**8. Worker de staging.** Rodar `bun run deploy:staging` da staging local com o seletor novo. Se o
perfil de validação mudou, reconstruir os contêineres. Conferir:

- `/healthz` responde 200;
- `/v1/runtime-deployments/` responde 200 para a release nova e para a `areas-1`;
- o `standalone.mjs` servido bate com o plano.

**9. Apps.** Os blocos de cenário e a autoria moram no Estúdio. Implantar Kids e Community só se o
código implantado ainda não tiver `pintaScenes.ts` com a autoria de hoje.

**10. Members (ativação).** Passos:

1. conferir a base: política `01c079c1…` e os hosts do plano anterior;
2. rodar `variable set --skip-deploys` da política nova e dos hosts de `configuration.hosts`;
3. reler os valores contra o plano;
4. fazer o redeploy.

**11. Conferência logada no staging.** Conferir os casos novos:

- um projeto Pygame Zero, um Raylib 2D e um Pygame-ce com um cenário PNG 5 do Pinta;
- os 9 blocos em "Cenários do Pinta", no nível 2;
- rodar, atravessar uma porta e bater numa barreira;
- reabrir sem perder blocos.

E conferir que o que já existia continua igual:

- um projeto antigo de cada família abre igual;
- o "repetir a cada" do Turtle e um Raylib 3D com região continuam funcionando.

**12. Rollback.**

1. No Members: a política `01c079c1…` e os hosts anteriores, juntos e com `--skip-deploys`, depois o
   redeploy.
2. Depois, o Worker com o seletor `1dd32fdc…`.

Os objetos no R2 são imutáveis e ficam.

⚠️ **Push.** Enquanto a staging local não chegar ao `origin`, o `wrangler.jsonc` de lá aponta um
seletor antigo. Um deploy do Worker feito a partir do `origin` voltaria o seletor e deixaria a release
que o Members anuncia fora do Worker. O mesmo aviso valeu para a `areas-1`.

**Produção** fica fora: pede o baseline lido por ela e o mesmo `manifestSha256`.
