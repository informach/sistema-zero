# Pinta Cenários 2D — estado da retomada (23/11/2026, escopo reduzido concluído)

A retomada terminou no **escopo reduzido** que a dona escolheu por causa dos créditos. Tudo está na
staging LOCAL, sem push, PR nem deploy. Este documento basta para continuar o que ficou de fora, nesta ou
noutra sessão. O arquivo da conversa da sessão que conduziu a retomada não foi gravado em disco.

## Regras que valem

- Commit e merge só na staging LOCAL, sem PR, push ou deploy sem a dona pedir.
  - A dona promove à produção quando tudo estiver testado em staging.
  - Isso vale também para a correção do Zappy no Pro: não fazer hotfix.
- **Sem flag de nada** (decisão de 23/11).
- `git add` escopado, nunca `-A`.
- Uma tarefa pesada por vez. Trava compartilhada: `node ~/backup-pinta-codex-20261122/pesado.mjs "<rótulo>" -- <cmd>`.
- Nunca editar:
  - `packages/molda-cenarios*`;
  - `packages/studio/src/python/blocks/areas.ts`;
  - `packages/studio/src/python/extensions/raylib/commonCatalog.ts`.
- Cursos gravados não quebram. Antes de cada entrada na staging, rodar:
  - `bun test docs/aulas-interativas-tecnico/qa`;
  - `protected-lessons.spec.ts`;
  - `ilha-do-farol-browser.ts`.
- A cada integração, rodar:
  - `check:validation-profile` (studio-runtime);
  - `check:region-phaser` (pinta);
  - `check:pro-engine-copies` (studio).
- O `COPY` do Pinta vai embutido no adaptador do Phaser: se o texto mudar, regenere o adaptador.
- Backup e controle ficam em `~/backup-pinta-codex-20261122/`: `mapa-integracao.tsv`, bundle das pontas,
  `achados-review.md`, `plano-correcoes.md` e os logs.

## Decisões da dona (23/11, nenhuma em aberto)

- **Galeria num perfil causal:** liberada.
- **Pro:** "Atualizar o motor" só troca cópia intacta.
- **Física antiga do Python:** a plataforma funciona igual ao JS.
- **"Preciso de ajuda":** só no aviso de recuperação.
- **Autorregras:** "Copiar o antes", "Guardar o depois", "🎲 Sortear de novo".
- **Tetos do motor 2D de `f79c03025`:** aprovados.
- **Motor Python:** versão ÚNICA, junto com Áreas do Python e Evolução do Estúdio. Outra sessão começou a
  montá-la em `97288bbd8`.
- **Escopo reduzido:**
  - etapa 8 cortada por ora;
  - etapa 9 só com guias, Vila e Floresta e o full review final;
  - etapas 3–5 ficam para depois.

## Feito (na staging local; topo `41487b1e5`)

| Parte | Commits principais |
|---|---|
| Integração do trabalho do Codex e correções | `mapa-integracao.tsv`; `8ed124dab` `f32083d76` `08d5bf0df` `a8ed6421e` `0ea0ff319` |
| Full review e lotes R1a, R2, R3, R4, R1b | `plano-correcoes.md`; resumo na versão `46abf1bc9` deste documento |
| Impedimento 1: revisão 9 numa política só | `bd4b2e76c` `9b57a1290` `14c59d0cd` |
| Impedimento 2: janela focal pela conta e ordem da galeria | `c1b2c16fb` `947bead70` `3ca3784e7` |
| Galeria causal liberada | `e3fe5cc10` `c16f4007f` |
| Etapa 1: regiões sem flag ("Mundo gigante", host, transporte 8, cliente antigo) | `4834ff812` `0d3c0ed65` `9efadaa8c` `d9d63c1c2` `91a9232a5` |
| Sem flags: conta do Pinta para todo aluno, com a adoção provada | `9126cd08b` `d6b427057` `a88354b9d` (`2026-11-23-pinta-sem-flags.md`) |
| Etapa 2, JS e Pro: "Atualizar o motor", Histórico, capa, Zappy e build hospedado | `26ffdfad6` `9be03a90a` `8f66148a1` `e5ffc4fdb` `53914c23c` `3711cf203` `0fc69bc92` `4fa80d977` `2cbfe7cef` |
| Etapa 2, Python: 27 blocos na promoção, IR sem perda e plataforma igual ao JS | `1f5a86418` `d591afffe` `4e3fbeef9` `f07b32e13` (`2026-11-23-pinta-release-python.md`) |
| Etapa 6: mensagens sem jargão, autorregras, "Preciso de ajuda", níveis e teclado, prévia focal | `07ffbf384` `5ec1f4ea2` `e3642650f` `f84ce4327` `3752785dc` `6fdfa1e27` `7bd41e1cc` `41487b1e5` |
| Etapa 7: Tiled, Phaser, Pygame e Godot reais com a Vila e a Cabana | `d3131965d` `74cf296b0` `71b91cc56` |
| Etapa 9 reduzida: guias (T6) e Vila e Floresta (unidade, programas reais e 16 fluxos de navegador) | `6922fb2e0` `8e2a8e55a` `25d3b11c7` |
| Full review final, com 2 revisores | Nuvem e acesso: nenhum achado. Pro, Python e UI: 3 achados, corrigidos em `2cbfe7cef` `7bd41e1cc` `41487b1e5` |

Para quando a staging for à produção:
- a correção do Zappy no Pro sai nesta ordem: Worker studio-runtime → Members → community-kids, community
  e admin;
- todo perfil adota a nuvem causal na primeira abertura do Pinta, então vale acompanhar os primeiros dias.

## Fora do escopo reduzido (para quando houver créditos)

1. ~~"Preciso de ajuda" de verdade~~ — **feito em 23/11** (`e106f5cff` `90b90a070` `051fa3bf3`, staging
   `e847ac1cd`):
   - conversa de recados com assunto `pinta_recovery`, uma por perfil, aberta fora da aula;
   - rota interna no members e rota `/api/pinta/recovery-help` nas duas comunidades, com a autorização
     das rotas do Pinta;
   - na caixa da equipe, o filtro "Ajuda do Pinta";
   - para a criança, o toast "Pronto! A equipe recebeu seu pedido e vai te ajudar." e o link "Ver
     conversa".

   Pendente:
   - a migração **0176** (`ALTER TYPE … ADD VALUE`) entra com o deploy do members;
   - falta conferir no navegador, logado, o caminho criança → equipe.
2. **Etapas 3–5:**
   - primeiro, levantar o que o Codex já deixou pronto nas regiões (conjuntos, seleção, espalhamento e
     imagens de peças têm lotes registrados no plano mestre);
   - depois, completar terreno, objetos, caminhos, portas, animações e profundidade no "Mundo gigante".
3. **Medição p95 da oficina regional:** não rodou na etapa 6. As metas são quadro ≤33,3 ms e gesto
   ≤100 ms em 1024×768.
4. **Versão única do motor Python:**
   - está em montagem por outra sessão (`97288bbd8`); seguir o documento da release;
   - a promoção mexe no staging remoto, então avisar a dona antes;
   - depois, requalificar os jogos gravados.
5. **Etapa 8, projeções em tudo:**
   - abrir e editar mapa projetado na oficina;
   - PNG 6 e jogadores Python projetados;
   - paridade entre os players e os exportadores;
   - anunciar o nativo 9 / nuvem 8 (`WORKSHOP_BODY_READABLE`).
6. **Etapa 9 completa:**
   - variantes;
   - PyDew Valley;
   - T7: ~13 mil caminhos `C:\Users\…` em recibos antigos.
7. **Revisão dedicada da adoção no aparelho:** o `pinta-cloud-persistence.ts` reconcilia as edições
   offline de antes do deploy com a fila causal. O full review final não leu essa parte inteira.

Abertos menores:
- de outras sessões:
  - 1 erro no typecheck do studio, vindo da sessão do Molda: `src/runtime/python/raylib/cenario-campo.test.ts`;
  - 15 testes do Estúdio no community-kids, instáveis na suíte cheia;
- da missão:
  - `missionObserver.test.ts`, instável sob carga;
  - uns 97 `.rejects` em `members/tests/db`;
  - o Pro da aula e o build da equipe recusam o 2D convertido.

## Fecho (feito em 23/11)

- **Worktrees:** `sistema-zero-pinta-integracao-20261120` e `sistema-zero-pinta-linha-b-20261123` foram
  apagadas pelo script seguro, com as junções soltas antes. O `node_modules/.bun` da árvore principal
  ficou intacto (1.687). Log: `~/backup-pinta-codex-20261122/worktrees-fecho.log`.
- **Branches:** `pinta-missao-retomada-20261121` e `pinta-linha-b-20261123` foram apagadas; as duas
  estavam inteiras na staging. As remotas `origin/pinta-missao-retomada-20261121` e
  `origin/pinta-rollout6-leitor-atual-20261121` ficam até o push da staging.
- **Containers:** `pinta-causal-20261122-db` e `pinta-floor-20261122-db` estão **parados**, não apagados.
  - Para religar: `docker start pinta-causal-20261122-db`.
  - Quando não precisar mais: `docker rm`.
- **Para retomar:** crie uma worktree a partir da staging local e rode `bun install --frozen-lockfile`
  nela. Ao terminar, apague a worktree pelo script seguro.
