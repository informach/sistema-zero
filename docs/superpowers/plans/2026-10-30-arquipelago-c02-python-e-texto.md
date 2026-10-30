# C02: desafios do Arquipélago na linguagem do posto

Data: 30/10/2026. Plano aprovado pela dona (trecho): o `ObjetivoDoDesafioSchema` aceita
`python`, reaproveitando `core/src/learning/python-project-checks.ts`; o Members confere com o
mesmo verificador das aulas; o Admin aceita o formato; quatro desafios novos (Recife em Pygame
Zero, Pico com fases como dados em Python, Vale em JavaScript textual, Nuvens em Pro), cada um
com inicial, gabarito e negativos rodados no executor real.

## O que o núcleo já tem

- Objetivos Python das aulas: `SectionPythonProjectCheckDraftSchema` (perfil, regra, `stdin`),
  `validateSectionPythonProjectChecks` e `sectionProjectChecksEnvironmentIssue` no core. Quem
  confere é `PythonProjectCheckerService.grade` (Members): monta o retrato do projeto, pede a
  missão ao runtime Python (contêiner com Chromium e Pyodide) e julga com
  `judgePythonProjectExecution`. A autorização vem de uma curadoria (`StudioProjectCuration`)
  avaliada pela política de runtime (`StudioRuntimePolicy.authorize`).
- Objetivos que rodam o jogo em JavaScript: `SectionProgressionService.evaluateObjectives`
  (estrutura no Members, execução no executor). O Pro já é aceito ali: o tipo e o `templateId`
  saem do projeto inicial (`runExecution`).
- A Ponte (modo `bridge`) é o JavaScript em texto do projeto clássico: o código é lido de volta
  para blocos (`bridgeReverseParse`). O Estúdio de desafio do jogo já permite esse modo.

## Arquivos e interfaces

1. Contrato (`packages/arquipelago-contracts/src/desafios.ts`): `ObjetivoDoDesafioSchema` vira a
   união do objetivo JavaScript (como hoje) e do objetivo Python
   (`programmingLanguage: 'python'`, `profileId`, `stdin?`). A regra continua opaca. Testes em
   `tests/desafios-python.test.ts`.
2. Members:
   - `SectionProgressionService.evaluatePythonObjectives`: o mesmo `python.checker.grade`, com a
     curadoria do desafio (vazia, só o modo do projeto inicial) no lugar do vínculo da aula.
   - `ArquipelagoObjectivesService.analisar` e `verificar` aceitam: Python (só objetivos de
     execução, mesmo perfil do inicial, mesma continuidade de ambiente), JavaScript clássico em
     Ponte (já aceito) e Pro JavaScript (mesmo modelo do inicial; o executor recebe o modelo do
     inicial). Python Pro continua recusado. Para Python não há derivação de blocos: os blocos
     Python não fazem parte do catálogo do servidor, então o desafio abre pela ilha.
   - Rota interna: o corpo passa a guardar `profileId` e `stdin` (antes eram descartados).
   - Testes em `tests/unit/arquipelago-objectives.service.test.ts` e nas rotas.
3. Admin (`packages/admin/src/app/admin/jogo/`, `lib/game-challenge-authoring.ts`,
   `components/editor/game-objectives-editor.tsx`): o rascunho aceita objetivos Python; o editor
   mostra o editor de execução Python quando o gabarito é Python. Editar projeto Python ou Pro no
   Estúdio do Admin continua indisponível (sem contexto de runtime fora das aulas): esses
   projetos chegam pelo manifesto. Testes nos testes existentes do pacote.
4. Pacotes (`docs/desafios-do-jogo/<ilha>/`), arquivos próprios para não misturar com os de
   blocos: `recife-python`, `pico-python`, `vale-texto`, `nuvens-pro`, Kids e adulto, todos com
   `publicar: false` e tipo `desafio-do-dia` (os seis quadros de cada ilha já estão ocupados;
   trocar um quadro é decisão da dona).
5. Executor real:
   - JavaScript clássico: `check-objectives.mjs` com o Chrome local (`SZ_CHECK_CHROMIUM`), como
     `recife-browser.test.ts`, com o documento montado por `prepareClassicCheckDocument`.
   - Python: a imagem de produção do studio-runtime (`python-mission.mjs`), como
     `python-mission-smoke.ts`, com a distribuição Python construída do vendor em cache.
   - Pro: a mesma imagem, com `vite build` offline e `check-objectives.mjs`, como
     `three-objectives-smoke.ts`.
6. Documentação: `conteudo-por-posto.md` e o README de cada ilha.

## Riscos

- O Estúdio de desafio do member-shell recusa projetos Python e Pro (o Python precisa de um
  contexto de autorização de runtime que hoje só existe em aulas, salas e autoria). A criança
  ainda não abre esses desafios no jogo. Registrar a lacuna; o mínimo coerente é abrir o
  JavaScript em Ponte no modo do projeto e dar um recado claro para Python e Pro.
- O ambiente Python do projeto aponta uma release do catálogo. A release dos pacotes precisa ser
  a do ambiente em que a dona importar; o gerador recebe a release como parâmetro.
- A máquina tem pouca memória: um contêiner e um navegador por vez.
