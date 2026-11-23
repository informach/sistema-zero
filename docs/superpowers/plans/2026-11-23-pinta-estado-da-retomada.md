# Pinta Cenários 2D — estado da retomada (23/11/2026, pausa)

O trabalho está **pausado a pedido da dona** (poucos créditos e pouco tempo). Este documento basta para retomar,
nesta ou noutra sessão; o arquivo da conversa da sessão que conduziu a retomada não foi gravado em disco.

## O pedido e as regras

A sessão do Codex que evoluía o Pinta para um editor de cenários 2D "tipo Tiled para crianças" travou em 22/11.
A dona pediu:
1. juntar tudo na staging LOCAL;
2. apagar as branches e worktrees integradas;
3. fazer um full review;
4. concluir o plano do Codex: [`2026-11-21-pinta-missao-retomada.md`](2026-11-21-pinta-missao-retomada.md), etapas 0–9.

Regras que valem:
- Commit e merge só na staging LOCAL. Sem PR, push nem deploy sem ela pedir.
  - Ela promove à produção quando tudo estiver testado em staging.
  - A correção do Zappy do Pro também espera a staging inteira; não fazer hotfix.
- **Sem flag de nada** (decisão de 23/11).
- `git add` escopado, nunca `-A`.
- Uma tarefa pesada por vez.
  - Trava compartilhada: `node ~/backup-pinta-codex-20261122/pesado.mjs "<rótulo>" -- <cmd>`. O código 75 significa ocupada.
  - O `--grep` com espaço quebra no shell do Windows.
- Nunca editar estes arquivos:
  - `packages/molda-cenarios*`;
  - `packages/studio/src/python/blocks/areas.ts`;
  - `packages/studio/src/python/extensions/raylib/commonCatalog.ts`.
- Cursos gravados não quebram. Antes de cada entrada na staging:
  - `bun test docs/aulas-interativas-tecnico/qa`;
  - `cd packages/studio && bunx playwright test e2e/protected-lessons.spec.ts --project=chromium --retries=0`;
  - `bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts`, com 7 casos `passed: true`.
- A cada integração, rodar:
  - `bun run --cwd packages/studio-runtime check:validation-profile`;
  - `bun run --cwd packages/pinta check:region-phaser`;
  - `bun run --cwd packages/studio check:pro-engine-copies`.

  Outras frentes (Molda, Pinta) já deixaram arquivos gerados para trás duas vezes.
- Testes de banco do members:
  - container `pinta-causal-20261122-db` em 127.0.0.1:55553, bancos `kids_journey_*`;
  - a senha só via `docker exec … printenv POSTGRES_PASSWORD`;
  - `try/catch`, nunca `expect(...).rejects`.

Backup e controle ficam em `~/backup-pinta-codex-20261122/`:
- `mapa-integracao.tsv`;
- o bundle das pontas;
- `achados-review.md`;
- `plano-correcoes.md`, com o andamento detalhado.

## Decisões da dona (23/11, nenhuma em aberto)

- **Galeria num perfil causal:** liberada, com a cópia conferida pelo hash. Feito.
- **Pro:** "Atualizar o motor" só troca cópia intacta. Feito.
- **Motor Python:** versão ÚNICA, junto com Áreas do Python e Evolução do Estúdio. Documento:
  [`2026-11-23-pinta-release-python.md`](2026-11-23-pinta-release-python.md).
- **Física antiga do Python:** a peça de plataforma vira plataforma, igual ao JS. Lote B6, interrompido.
- **"Preciso de ajuda":** só no aviso de recuperação da galeria, usando o canal de recados e os dados da recuperação. Etapa 6.
- **Autorregras:** "Copiar o antes", "Guardar o depois", "🎲 Sortear de novo". Saem o UUID da camada e o "Uma folha
  mudou" mostrado enquanto carrega. Etapa 6.
- **Tetos do motor 2D de `f79c03025`:** aprovados. Registrar cada aumento futuro com a medida.

## Na staging local (`71b91cc56` no momento da pausa)

| Lote | Commits principais |
|---|---|
| Integração + correções | ver `mapa-integracao.tsv`; `8ed124dab` `f32083d76` `08d5bf0df` `a8ed6421e` `0ea0ff319` |
| Review R1a, R2, R3, R4, R1b | ver a versão anterior deste documento (`46abf1bc9`) e `plano-correcoes.md` |
| F6-1 · revisão 9 numa política só | `bd4b2e76c` `9b57a1290` `14c59d0cd` |
| B1 · Pro "Atualizar o motor" | `26ffdfad6` `9be03a90a` `8f66148a1` |
| Galeria causal | `e3fe5cc10` `c16f4007f` |
| B2 · Histórico do Pro com o motor publicado; capa regional | `e5ffc4fdb` `53914c23c` |
| Impedimento 2 · janela focal pela conta + ordem da galeria | `c1b2c16fb` `947bead70` `3ca3784e7` |
| B3 · Zappy e build hospedado aceitam o motor publicado | `3711cf203` `0fc69bc92` |
| Etapa 1 · regiões sem flag ("Mundo gigante", host, transporte 8, cliente antigo) | `4834ff812` `0d3c0ed65` `9efadaa8c` `d9d63c1c2` `91a9232a5` |
| B4 · Python: Zappy protege o motor, os 27 blocos entram na promoção, IR sem perda, documento da release | `4fa80d977` `1f5a86418` `d591afffe` `4e3fbeef9` `e58ea6d61` `cdb8df792` |
| Etapa 7 · Tiled, Phaser, Pygame e Godot reais com a Vila e a Cabana | `d3131965d` `74cf296b0` `71b91cc56` |

Implantação da correção do Zappy, quando a staging for à produção: Worker studio-runtime → Members →
community-kids, community e admin.

## Interrompido, NÃO conferido, fora da staging

| Branch (worktree) | Commit | O que é |
|---|---|---|
| `pinta-missao-retomada-20261121` (`~/projects/sistema-zero-pinta-integracao-20261120`) | `a59367346` | Tirar as flags da missão (causal V1, perfis causais, paletas CAS…). Parou na suíte do members. O inventário era para ir a `2026-11-23-pinta-sem-flags.md`. |
| `pinta-linha-b-20261123` (`~/projects/sistema-zero-pinta-linha-b-20261123`) | `dfd96d54a` | Plataforma na física antiga do Python (B6). Parou na refatoração do pouso de tamanho fixo. |

**Para retomar cada um:**
1. Ler o diff do WIP (`git show <commit>`).
2. Terminar o lote.
3. Rodar os portões: testes, typecheck dos pacotes tocados e as provas dos cursos.
4. Fazer o merge da staging na branch.
5. Rodar `--ff-only` na staging local.

Na regiões, a conta só funciona com a fila causal, que depende do lote "sem flags".

## O que falta para fechar o plano (12 a 15 lotes, aproximadamente)

1. Terminar os dois lotes interrompidos acima.
2. **Etapa 6**, a que a criança sente primeiro e a recomendada para retomar:
   - mensagens sem jargão (U2);
   - "Preciso de ajuda" e "Antes/Depois";
   - 3 níveis, teclado e Esc no regional (U3);
   - prévia e toques na janela focal (U1);
   - medir p95 ≤33,3 ms por quadro e ≤100 ms por gesto em 1024×768.
3. **Etapas 3–5:** primeiro levantar o que o Codex já deixou pronto (conjuntos, seleção, espalhamento e imagens de
   peças têm lotes registrados no plano mestre). Depois completar terreno, objetos, caminhos, portas, animações e
   profundidade nas regiões.
4. **Versão única do motor Python**, seguindo o documento da release:
   - depende do E9 da Evolução do Estúdio e do lote 6 dos mundos de 2 km do Molda;
   - mexe no staging remoto (imagem, R2, Worker, Members), então avisar a dona antes;
   - depois, requalificar os jogos gravados: 20 Turtle, 58 Pygame Zero, 9 Raylib 2D, 8 Raylib 3D e 18 Pygame.
5. **Etapa 8** (a maior; pode esperar), as projeções:
   - abrir e editar o mapa projetado na oficina;
   - gestos, minimapa, seleção, histórico e backup;
   - PNG 6 e os 3 jogadores Python projetados;
   - paridade nos 5 players e nos 4 exportadores;
   - anunciar o nativo 9 / nuvem 8.
6. **Ensaios de navegador da oficina:** `pinta-causal-local.flow.ts`, `pinta-physical-regions` e
   `automapping-browser/prove.py`.
7. **Etapa 9:**
   - os dez passos da Vila e Floresta, as variantes e o PyDew Valley;
   - T6: `packages/pinta/CLAUDE.md` desatualizado e a API pública sem `./workshop-reader` e `./assets/causal`;
   - T7: ~13 mil caminhos `C:\Users\…` em recibos antigos;
   - full review final.
8. **Fecho:**
   - apagar as duas worktrees pelo script seguro (soltar as junções de `node_modules` antes);
   - apagar as branches integradas;
   - parar os containers `pinta-causal-20261122-db` e `pinta-floor-20261122-db`;
   - apagar `.cache/linha-b`.

Abertos menores:
- ~97 `.rejects` em `packages/members/tests/db`;
- `missionObserver.test.ts` instável sob carga;
- 15 testes do Estúdio no community-kids instáveis na suíte cheia (passam isolados);
- o Pro da aula não aceita o motor 2D convertido (só importa se uma aula Pro nascer de um 2D convertido);
- o build da equipe (auth/agent-runtime) recusa o 2D convertido.
