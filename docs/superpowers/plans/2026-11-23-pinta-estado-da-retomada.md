# Pinta Cenários 2D — estado da retomada (23/11/2026)

O arquivo da conversa da sessão do Claude que conduz esta retomada não foi gravado em disco. Este documento basta,
sozinho, para outra sessão continuar o trabalho.

## O pedido

A sessão do Codex que evoluía o Pinta para um editor de cenários 2D "tipo Tiled para crianças" (missão desde 17/11)
travou em 22/11 com cerca de 36 worktrees. A dona pediu:

1. reunir tudo na staging LOCAL, sem deixar nada de fora, apagando as branches e worktrees integradas;
2. fazer um full review;
3. concluir o plano do Codex.

**Documentos-base:**
- plano mestre do Codex: [`2026-11-21-pinta-missao-retomada.md`](2026-11-21-pinta-missao-retomada.md). As etapas
  macro 0–9 estão em "Ordem e critérios de fechamento"; só a 0 estava fechada.
- auditoria que orienta a ordem: `docs/pinta-cenarios/revisao-2026-11-18/qa/reaproveitamento-regional-2026-11-22.md`.
- plano desta retomada: `~/.claude/plans/eu-estava-trabalhando-em-breezy-hamster.md` (fases 0–6).
- backup e controle: `~/backup-pinta-codex-20261122/`. Lá estão:
  - `mapa-integracao.tsv`: cada commit original → aplicado/pulado, com evidência;
  - `pinta-pontas-20261123.bundle`: todas as pontas apagadas, restauráveis;
  - `achados-review.md`: todos os achados do review;
  - `plano-correcoes.md`: andamento dos lotes;
  - `pesado.mjs`: a trava, descrita abaixo.

## Regras que valem (da dona)

- Commit e merge só na staging LOCAL. Sem PR, push, deploy ou release, a menos que ela peça.
- Só as branches `staging` e `main`. Worktree integrada é apagada. `git add` escopado, nunca `-A`.
- Pouca memória: UMA tarefa pesada por vez. Typecheck autorizado nesta missão, um de cada vez.
- Nunca editar:
  - `packages/molda-cenarios*`;
  - `packages/studio/src/python/blocks/areas.ts`;
  - `packages/studio/src/python/extensions/raylib/commonCatalog.ts`.
- Os cursos gravados (Cadê, Chave do Farol, Ilha do Farol) não podem quebrar. Antes de levar cada lote à staging,
  rodar as três provas:
  - `bun test docs/aulas-interativas-tecnico/qa`;
  - `cd packages/studio && bunx playwright test e2e/protected-lessons.spec.ts --project=chromium --retries=0`;
  - `bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts` (7 casos `passed: true`).
- Quem dá push confere a staging local inteira, inclusive commits de outras sessões.

## Decisões dela (23/11)

1. **Galeria num perfil com a nuvem causal: LIBERAR.** Feito no lote da galeria causal, abaixo.
2. **Modo Pro:** sem atualização automática do motor, com o "Atualizar o motor" seguro, que só troca a cópia
   intacta. Feito no lote B1.
3. **Motor Python:** versão ÚNICA junto com as frentes Áreas do Python e Evolução do Estúdio. Aprovada.
   - O motor das Áreas (`2026-11-22-areas-1`) já foi ativado no staging por outra sessão. A versão que leva os
     blocos do Pinta será a próxima.
   - Quem fechar por último gera a versão; os jogos gravados são conferidos uma vez só.

Continuam abertos:
- "Preciso de ajuda" fora da aula;
- vocabulário Semente/Capturar entrada/Guardar saída;
- tetos do motor 2D.

## O que foi feito

### Fases 0–4: integração (22/11)

- O Codex foi encerrado e o estado congelado.
- O trabalho sem commit foi salvo em commits `wip(...)` nas próprias branches.
- Tudo foi integrado na branch `pinta-missao-retomada-20261121` e levado à staging local. A prova por commit está no
  `mapa-integracao.tsv`; as pontas, no bundle.
- Branches e worktrees do Pinta foram apagadas. Ficam as remotas `origin/pinta-missao-retomada-20261121` e
  `origin/pinta-rollout6-leitor-atual-20261121`, até ela pedir o push.

**Correções da integração:**
- `8ed124dab`: ReferenceError real no Estúdio selado (members);
- `f32083d76`: cena futura → `invalid-document`, e lista do invariante idb-keyval;
- `08d5bf0df`: poluição do `JWT_HS256_SECRET` no member-shell;
- `fcbba2180` e `cd71893fe`: tipos de teste;
- `a8ed6421e`: perfil de validação do studio-runtime regenerado;
- `0ea0ff319`: Godot 4.7.2 repetido no pacote integrado, sem falha.

### Fase 5: full review e lotes de correção (todos na staging local)

| Lote | Commits | O que corrigiu |
|---|---|---|
| R1a Pinta | `1339b0609` `77d10ed23` `17be14602` `b81c2ade3` `a730f1dc1` `9d0828d3e` `81f7ed8a7` `30fe4a16f` `150b1ea4a` `16a950b20` | U4, E1, E2, C1, C2, U5, U6 (editor e exportação) |
| R2 Python | `dacd33808` `6fc1231cd` `72bdc9cd2` `7452b4434` `56875ac6a` `09ba6e5dd` `c6e8f9ffc` `d5af74f86` | Y1–Y7; T3: os testes pygame rodam no CI |
| R3 Estúdio JS | `51ac930e2` `8aa3785ce` `5ced3ec18` `ebcbf9a7d` | J1: motor pelo id; J2: câmera; J3: área dispara 1x; T5: geradores regionais e `pinta.gd` no CI |
| R4 nuvem | `dfd7281e6` `ba1c6dd25` `cafd03081` `cad560b29` `7f1fbef7a` `324fec1ee` `e59acb416` `9f4415ca8` | G1, P1–P5, 403→`forbidden`, T1 (testes de banco do Pinta no CI) |
| R1b testes | `43ef52a74` `f9134c6a7` | T2: gravação incremental; T4: fixtures congeladas em `packages/pinta/src/export/__fixtures__` |

O detalhe de cada código (U4, E1, …) está em `achados-review.md`, no backup.

### Fase 6: concluir o plano do Codex (em andamento)

| Lote | Commits | Estado |
|---|---|---|
| F6-1 · impedimento 1: revisão 9 numa política só | `bd4b2e76c` `9b57a1290` `14c59d0cd` | Na staging. A oficina grava, recupera, baixa e sincroniza o mapa projetado (iso/hex); na galeria ele aparece como "ainda não abre nesta versão"; a folha usada por ele fica protegida. |
| B1 · Pro "Atualizar o motor" + prova do Clássico | `26ffdfad6` `9be03a90a` `8f66148a1` | Na staging. Inventário `gen:pro-engine-copies`, com 102 cópias reconhecidas. |
| Galeria causal (decisão 1) | `e3fe5cc10` `c16f4007f` | Na branch `pinta-missao-retomada-20261121`, EM CONFERÊNCIA. Typecheck de members e member-shell OK; faltam community-kids, community e core, as suítes e as provas dos cursos antes de ir à staging. |
| B2 · Histórico do Pro e capa | (agente rodando na worktree B) | Ver abaixo. |

Staging local no momento deste documento: `0d5a7991d`. Ela anda também por commits de outras sessões; sempre
mergear a staging na branch de trabalho antes do `--ff-only`.

## Onde está o trabalho agora

- **Frente A:** worktree `~/projects/sistema-zero-pinta-integracao-20261120`, branch
  `pinta-missao-retomada-20261121`. Fila: galeria causal (conferência) → impedimento 2 → etapa 1 → etapas 3–6 e 8.
- **Frente B:** worktree `~/projects/sistema-zero-pinta-linha-b-20261123`, branch `pinta-linha-b-20261123`.
  - Em curso, o lote B2:
    - o teto de 256 mil caracteres da revisão do Pro (`captureProRevision`) recusa a cópia convertida do motor 2D,
      de ~400 mil caracteres. Com isso, quebram nesses projetos o "Voltar para esta versão", as operações com
      arquivos, o Zappy e a atualização do Vite;
    - a capa de reserva (`coverCapture.ts`) recusa projeto com cenário regional.
  - Fila depois: B3 Python (os 27 blocos já existem em `packages/studio/src/python/extensions/pintaScenes.ts`;
    conferir nas três extensões, ver a divergência histórica de IR e preparar a versão única) → etapa 7.
- **Trava das tarefas pesadas, compartilhada entre as frentes:**
  `node ~/backup-pinta-codex-20261122/pesado.mjs "<rótulo>" -- <comando>`. O código 75 significa que a trava está
  ocupada; repita.
- **Testes de banco do members:**
  - usam o container `pinta-causal-20261122-db` (127.0.0.1:55553), com bancos `kids_journey_*`;
  - a senha só via `docker exec pinta-causal-20261122-db printenv POSTGRES_PASSWORD`, numa variável de ambiente,
    nunca em arquivo;
  - os nomes das variáveis estão no passo "Testes DB members" de `.github/workflows/ci.yml`.

## O que falta

1. **Fechar a galeria causal:** typecheck de community-kids, community e core; suítes de members (com os bancos) e
   member-shell; provas dos cursos; `--ff-only` da staging. Pendência anotada: o inventário causal pagina de 100 em
   100 por id, então quem tem mais de 100 desenhos pode não ver o mais novo na primeira página.
2. **B2:** conferir, integrar e dizer à dona se o defeito do Histórico já estava em produção.
3. **Impedimento 2:** edição focal (cenários grandes) também na conta. A revisão da janela e os recursos lidos
   entram no mesmo CAS, com pins e outbox V4 (`packages/pinta/src/state/localRegionEditing.ts:112-146`,
   `PintaApp.tsx`). Provar: falha do último PUT, edição concorrente, rede caída, recibo perdido e retomada.
4. **Etapa 1:** promover regiões atrás da flag desligada (galeria/host, transporte 8, inventário parcial da nuvem,
   leitura-só e rollback nos pontos de entrada). Ligar em produção é decisão dela.
5. **Etapa 2:** B3 Python e a versão única do motor.
6. **Etapas 3–5:** terrenos, objetos, conjuntos, espalhamento, geometria, caminhos, portas, animações e
   profundidade nas regiões, na oficina pública.
7. **Etapa 6:** câmera e navegação assinada, teclado, toque, Esc, mensagens sem jargão e os 3 níveis (U1–U3);
   medir p95 ≤33,3 ms por quadro e ≤100 ms por gesto em 1024×768.
8. **Etapa 7:** runners reais no pacote integrado (Tiled 1.12.2 em `.tmp/pinta-tools/tiled-files/tiled.exe`,
   Phaser 3.90, Pygame CE, Godot 4.7.2 em `.tmp/pinta-tools/godot/`) com a Vila e a Cabana. No Phaser, tirar a
   materialização `width×height` do ramo `infinite`.
9. **Etapa 8:** projeções em abertura, gestos, minimapa, seleção, histórico e backup; PNG6; jogadores Python
   projetados; paridade nos 5 players e 4 exportadores.
10. **Etapa 9:** os dez passos da Vila e Floresta, variantes e PyDew Valley.
    - T6: `packages/pinta/CLAUDE.md` desatualizado; API pública sem `./workshop-reader` e `./assets/causal`;
      teto antigo em `geometria-das-projecoes.md`.
    - T7: ~13,4 mil caminhos `C:\Users\…` em 237 recibos.
    - Full review final.
11. **Ensaios de navegador ainda não repetidos no pacote integrado:**
    - `pinta-causal-local.flow.ts` (rótulo "Baixar arquivos para a equipe");
    - `pinta-physical-regions`;
    - `e2e-runtime/python-pinta-2d-browser.spec.ts`;
    - `verify-region-phaser.ts` com e sem `--projected`;
    - Tiled real (`PINTA_TILED_BIN`), homologação Pygame, `automapping-browser/prove.py` e `homologacao/check.ts`.
12. **Fecho:**
    - apagar as duas worktrees pelo script seguro (soltar as junções de `node_modules` antes; ver a memória
      "worktree comeu node_modules");
    - apagar as branches integradas;
    - parar os containers `pinta-causal-20261122-db` e `pinta-floor-20261122-db`.

Abertos, para depois:
- ~97 `.rejects` em `packages/members/tests/db` podem pendurar como o G1;
- dois testes dependem de implantação antecessora;
- perfis de QA já têm "(edição recuperada)" duplicados.

## Próximo passo

Terminar a conferência da galeria causal, item 1 acima, e levá-la à staging local. Em seguida:
- disparar o impedimento 2 na frente A;
- conferir e integrar o B2 quando ele terminar;
- disparar o B3 Python na frente B.
