# Raio-X das 45 cenas · como implantar

O procedimento de deploy das aulas interativas do Raio-X (lotes 1 a 5, commit `e4824b8b` na `staging`,
16/09/2026). Tudo o que precisa ser feito FORA do código mora aqui: a ordem dos serviços, os manifestos a
importar e em que ordem, e o aviso de que reimportar um manifesto já importado recomeça o progresso em
andamento.

⚠️ Os relatórios de trabalho dos lotes ficam em `packages/community-kids/tmp/storyboard/implementacao/`, que o
git ignora. Nada operacional pode depender deles: o que valer para o deploy precisa estar neste arquivo.

## 1. Onde cada ambiente está

- **Produção** (`main`): ainda NÃO tem `packages/core/src/learning`. Não existe player de cena, sessão de cena
  nem tentativa de cena no banco. A primeira promoção leva tudo de uma vez.
- **Staging**: recebeu o lote inteiro no push de `e4824b8b` (junto com 19 commits de outra frente, com
  migrations `catalog 0005` a `0007`, `funnel 0015` e `0016` e `members 0087`). É onde a dona faz QA.

⭐⭐ **A funcionalidade nasce na PRIMEIRA versão** (decisão da dona, 17/09/2026). Não existe versão anterior
no mundo real: nada de cena foi ao ar, e na staging só um manifesto de uma aula foi importado para teste. Por
isso o código não tem carimbo de versão das regras, flag de compatibilidade nem tolerância a formato anterior —
e nem deve ganhar. Mudou uma regra de meta? Muda para todo mundo, e a única precaução é a ordem de deploy
abaixo.

## 2. Ordem de deploy: o servidor antes dos clientes

⚠️⚠️ **Com o kids novo contra o members antigo, a criança lia "Você descobriu!" e o servidor gravava
`passed:false`** (32 de 142 blocos simulados) ou recusava com 400 (10 de 142). O motor é o mesmo dos dois
lados, então player e servidor só discordam quando estão em versões diferentes do MESMO código. Duas defesas:

- **O `deploy-staging` do `ci.yml` espera o members** ficar pronto antes de disparar community-kids e
  community (`DEPOIS_DO_MEMBERS`), quando o push leva os dois; se o members falhar, os apps NÃO sobem e o job
  fica vermelho. ⚠️ Um push novo cancela o run: cancelado entre as duas fases, os apps ficam sem deploy, e o
  remédio é `gh workflow run ci.yml --ref staging -f services=community-kids,community`.
  **Isto não é ponte, é invariante de deploy: não tire a ordem do `ci.yml`.**
  ⚠️⚠️ **O workflow "Deploy produção" NÃO tem essa espera**: ele monta a lista e dispara todos os serviços
  em paralelo. Na produção a ordem é feita À MÃO, nos passos 1 e 2 abaixo.
- **O player se defende**: segmento ou tentativa recusados com 400/422 viram "Esta atividade mudou." com
  "Abrir de novo", e a conclusão sai da tela. A criança não lê uma vitória que o servidor não gravou; ela
  reabre a aula e o player novo entra no lugar.

### Produção (a primeira promoção para `main`)

1. `gh workflow run "Deploy produção" --ref staging -f services=members` e esperar convergir (a migration do
   members roda no `preDeployCommand` e atrasa o "pronto").
2. `gh workflow run "Deploy produção" --ref staging -f services=<community-kids,community,admin e os backends do core>`.
3. Importar os manifestos (seção 4). Na produção não há bloco de cena antigo: a consulta da seção 3 volta vazia.

Conferir o sha por serviço depois de cada passo (CI vermelho é push sem deploy).

⚠️ **Env a apagar nos DOIS ambientes:** `SCENE_CLOCK_STRICT` saiu do `.env.example` e do `EnvSchema` do
members. Se ela ainda estiver setada no Railway, é inofensiva (o Zod descarta chave desconhecida, medido),
mas deve ser removida do serviço `members` na staging e na produção, e de qualquer `.env` local.

### Pushes seguintes

1. O lote numa branch: `gh workflow run ci.yml --ref <branch> -f services=members`. O `deploy-staging` aceita
   `workflow_dispatch` de qualquer ref e só roda depois do `ci` verde. Esperar SUCCESS e conferir o sha.
2. Push na `staging` (o members sobe de novo com o mesmo código; community-kids e community sobem novos).
3. Importar o que o lote pedir.

## 3. Consulta ao banco antes de importar

Blocos criados ou editados à mão no admin não passam pela validação dos manifestos. O player passa a projeção
pública pelo validador inteiro do core, e um bloco que cita o que não existe vira INVÁLIDO: a atividade não
aparece e, se for obrigatória, a seção não fecha ("precisa de uma configuração válida").

⚠️ A LEITURA é tolerante com o objetivo que a cena não tem (`sceneActivityForReading`/`sceneSetupGoals` do
core): o id desconhecido sai do `setup.goals` (sem nenhum que valha, a missão volta a ser a do modelo) e o
`waitFor` que cita um deles sai do roteiro, para a criança não perder a aula por um erro de autoria. Quem
autora VÊ o problema: o editor do admin nomeia cada objetivo que a cena não tem, o rascunho guarda assim e a
PUBLICAÇÃO recusa, com uma mensagem que nomeia os ids.

⚠️⚠️ **A leitura tolerante NÃO salva bloco com AÇÃO ilegal.** O `sceneActivityForReading` descarta `goals` e
`waitFor` desconhecidos, e nada mais: a ação que a cena não aceita derruba o bloco inteiro, a atividade some
da aula e a seção obrigatória não fecha. É para ela que a consulta abaixo vale.

As ações que deixaram de ser legais em cena NENHUMA (a limpeza de 17/09/2026 as tirou do core): `paint`,
`mirror`, `wireframe`, `mode` e `clock`. E as que deixaram de valer na cena em que estavam: `move` e
`collide` na `restart`. Continuam ilegais de antes: `advance` na `random`, na `acceleration` e na `diagonal`;
`sample` de LUGAR (`kind: "position"`) na `acceleration`. Some-se o roteiro cujo `waitFor` (de meta que
existe) não acontece, que nenhum filtro de SQL pega.

Ids que não existem mais em cena nenhuma, e que um bloco de rascunho da staging ainda pode citar: `same-x`
(`coordinates`), `separate` (`hitbox`), `cut` e `two-cells` (`sheet-vs-sprite`).

Filtro rápido nos blocos publicados:

```sql
SELECT id, lesson_id, content->'activity'->>'scene' AS cena
FROM members.lesson_blocks
WHERE archived_at IS NULL AND kind = 'interactive'
  AND (jsonb_path_exists(content, '$.activity.setup.goals[*] ? (@ == "same-x" || @ == "separate" || @ == "cut" || @ == "two-cells")')
    OR jsonb_path_exists(content, '$.activity.script[*].waitFor ? (@ == "same-x" || @ == "separate" || @ == "cut" || @ == "two-cells")')
    -- As cinco que não valem em cena nenhuma.
    OR jsonb_path_exists(content, '$.activity.** ? (@.type == "paint" || @.type == "mirror" || @.type == "wireframe" || @.type == "mode" || @.type == "clock")')
    -- As que saíram da cena em que estavam.
    OR (content->'activity'->>'scene' = 'restart'
        AND jsonb_path_exists(content, '$.activity.** ? (@.type == "move" || @.type == "collide")'))
    OR (content->'activity'->>'scene' IN ('random','acceleration','diagonal')
        AND jsonb_path_exists(content, '$.activity.** ? (@.type == "advance")'))
    OR (content->'activity'->>'scene' = 'acceleration'
        AND jsonb_path_exists(content, '$.activity.** ? (@.type == "sample" && @.kind == "position")')));
```

⚠️ Rode a MESMA consulta nos rascunhos, trocando a tabela por
`members.lesson_drafts.document -> 'blocks'`: o bloco editado à mão vive lá antes de publicar.

O filtro não pega um roteiro autoral cujo `waitFor` não acontece. A conferência completa é passar o `content`
de cada bloco interativo de cena (os publicados em `members.lesson_blocks` com `archived_at IS NULL`, e os de
rascunho em `members.lesson_drafts.document -> 'blocks'`) pelo `isInteractiveBlock` do core e listar os
recusados para a dona reautorar.

## 4. Manifestos a importar

São **27 manifestos**, e é a PRIMEIRA importação deles (a staging tem um só, de uma aula, importado para
teste). Todos DEPOIS de community-kids e community no ar (seção 2). A ordem abaixo é a dos cursos: nenhum
manifesto depende de outro, e nenhum tem prioridade por causa de sessão em andamento.

**Passo 0 (só na staging): apagar as sessões de cena de teste.** Elas são da dona, feitas para testar, e não
valem nada. Com o conserto de 17/09/2026 uma sessão ilegível não trava mais nada (o servidor a trata como
inexistente, a cena recomeça limpa e a gravação nova substitui a linha), então isto é HIGIENE, não
desbloqueio. Olhe antes de apagar:

```sql
-- 1) o que existe
SELECT user_id, lesson_id, block_id, revision, updated_at,
       jsonb_array_length(answers->'sceneCheckpoint') AS pedacos
FROM members.lesson_block_progress
WHERE answers ? 'sceneCheckpoint'
ORDER BY updated_at;

-- 2) apagar (só na staging, e só depois de olhar o SELECT acima)
DELETE FROM members.lesson_block_progress WHERE answers ? 'sceneCheckpoint';

-- 3) opcional: as tentativas de cena guardadas (não são reavaliadas; só aparecem no painel)
DELETE FROM members.learning_attempts WHERE answers ? 'sceneCheckpoint';
```

Na produção este passo não existe: não há sessão de cena nenhuma.

1. `corre-dino-v6/aula-01` a `aula-13` (as 13).
2. `desafio-primeiro-jogo-v6/introducao`, depois `dia-1` a `dia-5` (as 6).
3. `o-jogo-do-meu-jeito-v6/aula-01` a `aula-08` (as 8).

Antes de importar: **`bun docs/aulas-interativas/qa/validar-manifestos-v6.ts`**, que é o portão destes 27 (ele
roda no CI). ⚠️ O `validar-manifestos.ts` valida o `catalogo.json` da RAIZ, o conjunto ANTERIOR ao v6, e não
serve de portão aqui. Os três validadores completos (`validar-revisao-completa.ts`, `validar-desafio-v6.ts`,
`validar-meu-jeito-v6.ts`) exigem os roteiros originais das entregas de vídeo, que não moram no repositório.

### Acréscimos depois do full review (completar aqui)

Consertos posteriores que mudarem um `manifesto.json` entram nesta lista, com o motivo e a posição na ordem
acima. Quem acrescenta: o agente que mudou o manifesto e o orquestrador do lote.

| Manifesto | O que mudou | Entra depois de |
| --- | --- | --- |
| (nenhum ainda) | | |

### Depois de importar: a voz do Zappy

As instruções e as falas do Zappy saem na voz dele, gravada no ElevenLabs — mas o manifesto NÃO carrega
o áudio: ele é gerado na autoria. Depois de importar cada aula, abra o editor dela e clique em **"Gerar a
voz do Zappy"** (ao lado de "Revisar para publicar"), e publique. Sem isso nada quebra: o "Ouvir" continua
saindo na voz do navegador, como antes.

⚠️ Reimportar um manifesto reescreve os blocos e leva o dicionário junto — clique no botão de novo. O
áudio continua no R2 e é reaproveitado, então regerar não custa crédito nenhum.

⚠️ Exige `ELEVENLABS_API_KEY` no serviço **admin** do ambiente (só nele). Guia completo:
[`docs/voz-do-zappy.md`](../voz-do-zappy.md).

## 5. ⚠️ REIMPORTAR um manifesto já importado recomeça o progresso EM ANDAMENTO

`members/src/infrastructure/persistence/drizzle/lesson-draft.repository.ts` dá revisão nova a todo bloco cujo
JSON mudou, e o progresso é casado por revisão. Quem estiver no meio de um bloco que mudou recomeça a
atividade. Seções e aulas já concluídas ficam (a seção guarda `completed_at`), e tentativas aprovadas não são
reavaliadas.

- ⚠️ Vale só para o bloco cujo JSON MUDOU: a importação marca como `preserve` o bloco idêntico, a revisão não
  muda e nada recomeça. Reimportar o mesmo arquivo é seguro, e por isso também não cura nada no banco.
- Vale para a staging, onde um manifesto já foi importado, e para toda reimportação depois da estreia.
- Reimportar fora do horário de uso e avisar quem está no meio dessas aulas.
- O painel do professor relê tentativas antigas com o catálogo de hoje: uma tentativa aprovada pode aparecer
  com uma meta nova "Pendente" e com o id cru de uma opção de previsão que mudou. O `passed` gravado não muda.
