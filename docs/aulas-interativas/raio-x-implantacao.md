# Raio-X das 45 cenas · como implantar

O procedimento de deploy das aulas interativas redesenhadas no Raio-X (lotes 1 a 5, commit `e4824b8b` na
`staging`, 16/09/2026). Tudo o que precisa ser feito FORA do código mora aqui: a ordem dos serviços, a flag
`SCENE_CLOCK_STRICT`, a consulta ao banco antes de reimportar, os manifestos a reimportar e em que ordem, o
aviso de progresso que recomeça e as pontes de compatibilidade que um dia saem.

⚠️ Os relatórios de trabalho dos lotes ficam em `packages/community-kids/tmp/storyboard/implementacao/`, que o
git ignora. Nada operacional pode depender deles: o que valer para o deploy precisa estar neste arquivo.

## 1. Onde cada ambiente está

- **Produção** (`main`): ainda NÃO tem `packages/core/src/learning`. Não existe player de cena, sessão de cena
  nem tentativa de cena no banco. A primeira promoção leva tudo de uma vez.
- **Staging**: recebeu o lote inteiro no push de `e4824b8b` (junto com 19 commits de outra frente, com
  migrations `catalog 0005` a `0007`, `funnel 0015` e `0016` e `members 0087`). É onde a dona faz QA, e é
  onde existem as janelas de versão descritas abaixo (player antigo aberto numa aba × members novo).

## 2. As duas peças que decidem a compatibilidade

- **`SCENE_CLOCK_MARK`** (`packages/core/src/learning/scene/session.ts`, hoje `2`). Apesar do nome, é a
  **versão das regras do player**, e não "tem relógio". O player manda o número em todo segmento
  (`sceneSegmentAnswers`); o members compara por IGUALDADE (`sceneSegmentHasClock`). Outro valor, ou nenhum, é
  "player de outra versão". ⚠️ Mudou uma regra de meta que o player decide sozinho? Suba o número no mesmo
  commit. O `2` cobre todos os lotes do Raio-X desde que eles subam JUNTOS; um push dividido com regra nova nas
  duas partes precisa de `3` na segunda.
- **`SCENE_CLOCK_STRICT`** (env do members, padrão desligada; `packages/members/.env.example`). Ligada, todo
  segmento sem o marcador atual recebe **409 `LEARNING_CONFLICT`** antes de aplicar, em qualquer cena, e o
  player antigo mostra "Reabra a aula". Desligada, o members tolera o player antigo na demonstração
  (`tolerarPlayerAnterior`) e só recusa a TENTATIVA quando a cena não fecha no servidor
  (`cenaFechouNoServidor`, também 409). ⚠️ Chave vazia no `.env` derruba o boot: comente, não deixe `=`.

**Regra de ouro da flag:** desligue a flag ANTES de (a) subir um members com `SCENE_CLOCK_MARK` novo,
(b) qualquer rollback do members, (c) qualquer rollback do community-kids ou do community. Religue quando
members, community-kids e community estiverem na mesma versão. Com a flag fixa ligada, um members com
marcador `3` recusa todo player no ar (que manda `2`), e um members voltado para um marcador menor recusa o
kids novo.

## 3. Ordem de deploy

⚠️⚠️ **Com o kids novo contra o members antigo, a criança lia "Você descobriu!" e o servidor gravava
`passed:false`** (32 de 142 blocos simulados) ou recusava com 400 (10 de 142). Três defesas desde os consertos
do full review de dados e deploy (`community-kids/tmp/storyboard/implementacao/consertos-full-dados.md`):
- **O `deploy-staging` do `ci.yml` espera o members** ficar pronto antes de disparar community-kids e
  community (`DEPOIS_DO_MEMBERS`), quando o push leva os dois; se o members falhar, os apps NÃO sobem e o job
  fica vermelho. ⚠️ Um push novo cancela o run: cancelado entre as duas fases, os apps ficam sem deploy, e o
  remédio é `gh workflow run ci.yml --ref staging -f services=community-kids,community`.
- **O "Deploy produção" continua disparando tudo em paralelo**: na produção a ordem segue à mão (abaixo).
- **O player se defende**: segmento recusado com 400, ou tentativa recusada por um members que não devolveu o
  marcador, vira "Esta atividade mudou." com "Abrir de novo" (a conclusão sai da tela). A criança não lê mais
  uma vitória que o servidor não gravou; ela ainda precisa reabrir depois que o members subir.

### Staging, depois do push de `e4824b8b` (o que fazer agora)

1. Acompanhar o run do CI até o `deploy-staging` convergir e **conferir o sha de CADA serviço** (CI vermelho
   é push sem deploy). Anotar em que ordem members e community-kids chegaram a SUCCESS: se o kids chegou
   antes, a janela existiu por alguns minutos e quem concluiu uma cena nela precisa refazer a atividade.
2. Com community-kids E community no ar: **`SCENE_CLOCK_STRICT=true`** no members (a variável reinicia o
   serviço).
3. **Consulta ao banco** (seção 4) e reautoria do que ela listar.
4. **Reimportar os manifestos** (seção 5), fora do horário de uso (seção 6).

### Próximos pushes que mudam regra de meta (staging)

1. O lote numa branch: `gh workflow run ci.yml --ref <branch> -f services=members`. O `deploy-staging` aceita
   `workflow_dispatch` de qualquer ref e só roda depois do `ci` verde. Esperar SUCCESS e conferir o sha.
2. Se o marcador subiu: desligar `SCENE_CLOCK_STRICT` antes do passo 1.
3. Push na `staging` (o members sobe de novo com o mesmo código; community-kids e community sobem novos).
4. Religar a flag quando os três estiverem no ar. Reimportar o que o lote pedir.

### Produção (a primeira promoção para `main`)

1. `gh workflow run "Deploy produção" --ref staging -f services=members` e esperar convergir (a migration do
   members roda no `preDeployCommand` e atrasa o "pronto").
2. `gh workflow run "Deploy produção" --ref staging -f services=<community-kids,community,admin e os backends do core>`.
3. `SCENE_CLOCK_STRICT=true` logo em seguida: na produção não existe player antigo a proteger.
4. Importar os manifestos (na produção não há conteúdo antigo de cena; a consulta da seção 4 volta vazia).

Conferir o sha por serviço depois de cada passo.

## 4. Consulta ao banco antes de reimportar

Blocos criados ou editados à mão no admin não passam pela validação dos manifestos. O player novo passa a
projeção pública pelo validador inteiro do core, e um bloco que cita o que saiu vira INVÁLIDO: a atividade
não aparece e, se for obrigatória, a seção não fecha ("precisa de uma configuração válida").

⚠️ **Desde os consertos do full review de dados e deploy, as METAS que saíram são toleradas na leitura**
(`sceneActivityForReading`/`sceneSetupGoals` do core): `cut` vira `crop-whole`, as outras três saem do
`setup.goals` (sem nenhuma que valha, a missão volta a ser a do modelo) e o `waitFor` que cita uma delas sai do
roteiro. O bloco aparece e a seção fecha; o editor do admin avisa e oferece "Tirar do caso". Continuam
recusados na leitura, e é para eles que a consulta abaixo segue valendo: a ação que deixou de ser legal
(`advance` na `random`/`acceleration`/`diagonal`, `sample` de lugar na `acceleration`) e o roteiro cujo
`waitFor` (de meta que existe) não acontece mais pelas regras novas.

O que saiu nos lotes: as metas `same-x` (`coordinates`), `separate` (`hitbox`), `cut` e `two-cells`
(`sheet-vs-sprite`); a ação `advance` na `random`, na `acceleration` e na `diagonal`; o `sample` de lugar na
`acceleration`.

Filtro rápido nos blocos publicados:

```sql
SELECT id, lesson_id, content->'activity'->>'scene' AS cena
FROM members.lesson_blocks
WHERE archived_at IS NULL AND kind = 'interactive'
  AND (jsonb_path_exists(content, '$.activity.setup.goals[*] ? (@ == "same-x" || @ == "separate" || @ == "cut" || @ == "two-cells")')
    OR jsonb_path_exists(content, '$.activity.script[*].waitFor ? (@ == "same-x" || @ == "separate" || @ == "cut" || @ == "two-cells")')
    OR (content->'activity'->>'scene' IN ('random','acceleration','diagonal')
        AND jsonb_path_exists(content, '$.activity.** ? (@.type == "advance")')));
```

O filtro não pega um roteiro autoral cujo `waitFor` deixou de acontecer pelas regras novas. A conferência
completa é passar o `content` de cada bloco interativo de cena (os publicados em `members.lesson_blocks` com
`archived_at IS NULL`, e os de rascunho em `members.lesson_drafts.document -> 'blocks'`) pelo
`isInteractiveBlock` do core novo e listar os recusados para a dona reautorar.

## 5. Manifestos a reimportar

Todos DEPOIS de community-kids e community novos no ar: cinco só validam no members novo, e o player antigo
recusa cinco blocos novos. Nesta ordem:

1. `desafio-primeiro-jogo-v6/dia-4` · roteiro próprio das `lives` (o do modelo encolheu de 4 para 3 partes) e a
   `variable`.
2. `desafio-primeiro-jogo-v6/dia-2` · obrigatória: `setup.goals` `down`/`up` (o publicado cobra `moves`/`left`),
   elenco, caso, previsão e pergunta.
3. `desafio-primeiro-jogo-v6/dia-1` · caso da `coordinates` em 800 × 480, pergunta com ids novos, `world` e
   `draw-loop`.
4. `desafio-primeiro-jogo-v6/dia-3` · `velocity` (caso, roteiro, previsão) e pergunta da `spawn`.
5. `o-jogo-do-meu-jeito-v6/aula-06` · recorte (`setup.goals` e pergunta novos) e previsão da folha.
6. `corre-dino-v6/aula-01` a `aula-13` (as 13) · instruções e pistas; Aula 3 caso e previsão da `gravity`;
   Aulas 5 e 12 as demonstrações da `velocity`; Aulas 6 e 7 previsões.
7. `o-jogo-do-meu-jeito-v6/aula-02` (espelho: pergunta e seções), `aula-03`, `aula-04` (previsão e pergunta da
   `pixel-vector`), `aula-05` (pergunta da `layers`) e `aula-07`.

São 23 manifestos. `docs/aulas-interativas/qa/desafio-aulas-00-02.ts` e `qa/revisao-editorial-aula-01.ts`
acompanham o texto novo e não se importam. Antes de importar: `bun docs/aulas-interativas/qa/validar-manifestos.ts`.

### Acréscimos depois do full review (completar aqui)

Consertos posteriores que mudarem um `manifesto.json` entram nesta lista, com o motivo e a posição na ordem
acima. Quem acrescenta: o agente que mudou o manifesto e o orquestrador do lote.

| Manifesto | O que mudou | Entra depois de |
| --- | --- | --- |
| (nenhum ainda) | | |

## 6. ⚠️ Reimportar recomeça o progresso EM ANDAMENTO

`members/src/infrastructure/persistence/drizzle/lesson-draft.repository.ts` dá revisão nova a todo bloco cujo JSON mudou, e o progresso é casado por
revisão. A lista da seção 5 muda 38 blocos (21 só no texto: instrução, pista ou título), e quem estiver no
meio de um deles recomeça a atividade. Seções e aulas já concluídas ficam (a seção guarda `completed_at`), e
tentativas aprovadas não são reavaliadas.

- Reimportar fora do horário de uso e avisar quem está no meio dessas aulas na staging.
- A experimentação da Aula 6 de O Jogo do Meu Jeito passa a cobrar `crop-half` e `crop-whole` além de
  `size-apart`.
- O painel do professor relê tentativas antigas com o catálogo novo: uma tentativa aprovada pode aparecer com
  uma meta nova "Pendente" e com o id cru de uma opção de previsão que mudou. O `passed` gravado não muda.

## 7. Pontes do Raio-X (remover depois)

Código que só existe para atravessar a janela de versão. Cada um vira código morto depois do critério.

| Ponte | Onde | Sai quando |
| --- | --- | --- |
| O ramo sem `SCENE_CLOCK_STRICT` e a `tolerarPlayerAnterior` que ele alimenta | `core/.../scene/session.ts`, `members/.../learning.service.ts` | a flag ligada na produção há 30 dias e nenhuma sessão de cena no banco com marcador diferente do atual |
| O 409 de `cenaFechouNoServidor` para o player de antes das regras | `members/.../learning.service.ts` | o mesmo critério da linha acima |
| A leitura do palpite antigo no `sessionStorage` | `member-shell/.../scene-prediction.tsx` | 30 dias depois do deploy do kids na produção (o `sessionStorage` morre com a aba) |
| Ações legadas mantidas por sessões e roteiros salvos (`paint`, `mirror`, `wireframe`, `mode`, `clock`, `move`/`collide` na `restart`, `cut`) | `core/.../scene/actions.ts`, `engine.ts`, o DTO do members e o editor do admin (escondidas por cena) | nenhum bloco (publicado ou rascunho) e nenhuma sessão de cena no banco usa a ação |
| A marca antiga do mapa (`#3`, sem a casa) | `core/.../scene/nucleo.ts` (`tilemapMarkedRows`) e `engine.ts` (`escreverNoMapa`) | nenhuma sessão da `tilemap` gravada antes de `e4824b8b` |
