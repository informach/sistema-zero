# Correções e melhorias das experiências do Faísca

**Objetivo:** resolver F1–F5 e O1–O3 do review da staging `c4883ea16`, conforme pedido de implementação.

**Referência:** `.audits/architectural-analysis-2026-11-08-faisca-staging.md`.

**Arquitetura:** o motor continua sendo a autoridade das respostas e descobertas. A moldura terá um lugar próprio para controles essenciais junto ao palco. Os três movimentos contínuos compartilharão direções, RAF, pausa e limpeza, conservando colisão e projeção em seus adaptadores. O foco de mídia da atividade também controlará o relógio local da Ponte.

**Restrições:** preservar snapshots dos jogos, progresso e descobertas entre partidas; fala do Zappy convive com relógio; vídeo pausa a atividade. Retomar exige gesto. Não publicar conteúdo. Trabalho em `fix/faisca-review-20261108`, a partir da staging local; ao concluir, fazer commit e merge no worktree de staging, conforme pedido posterior do usuário.

## 1. Respostas e orientação (F1, F3, F4)

- [x] Acrescentar regressões em `packages/core/src/learning/scene/poderes-simbolos-cabana.test.ts` e `poderes-ponte-moedas.test.ts`: `ou → e` com chave apenas deve fechar na exploração livre; seis moedas esgotadas devem pedir reinício; reinício conserva descobertas e sumiço desligado.
- [x] No `engine.ts`, recalcular `door` em cada `try-cabin` livre (`abre ? 'open' : 'closed'`), mantendo a persistência da bancada do jogo.
- [x] Em `guidance-moedas.ts`, quando faltar `counts-again` e `!c.present.some(Boolean)`, pedir nova partida antes da comparação. Sincronizar a nova fala em `zappy-etapas.json`.
- [x] Em `scene-poder-simbolos.tsx`, representar sequência concluída no caderninho sem alterar `passo` do projeto.
- [x] Executar `bun test ./packages/core/src/learning/scene/poderes-simbolos-cabana.test.ts ./packages/core/src/learning/scene/poderes-ponte-moedas.test.ts` e testes dos componentes envolvidos.

## 2. Movimento e foco (F2, O3)

- [x] Extrair o contrato de contexto da moldura e criar um hook compartilhado para direções seguradas, delta limitado, RAF, reset, blur, aba escondida e desmontagem.
- [x] Adaptar `useAndarLivre`, `useMapaLivre` e `useAndar3D`; preservar normalização diagonal, limites, deslizamento nas colisões e giro da câmera.
- [x] Expor pausa, retomada e permissão de avanço do dono de mídia de `scene-activity.tsx`; consumir no relógio da Ponte e no hook de movimento.
- [x] Oferecer retomada explícita da Ponte após pausa por vídeo, além de retomar ao voltar a andar.
- [x] Tornar permanente a reprodução do relógio em `community-kids/tests/lesson-scene-faisca-media.test.tsx`; testar pausa por vídeo, convivência com fala, retomada e limpeza dos movimentos.

## 3. Palco e controles (O1)

- [x] Acrescentar `movimento` ao `Frame`: controles essenciais imediatamente após o palco, antes dos módulos de regras e memória.
- [x] Mover as setas dos quatro Poderes, da porta 3D e do contato da Ilha para esse lugar. Manter uma única instância de cada controle e a ordem do DOM coerente.
- [x] Ajustar `scene-discovery-moldura.css` para faixa compacta de movimento com alvos de toque preservados e palco visível em 320/390 px, normal e ampliado.
- [x] Validar interseção do palco e setas com a viewport durante toque real em Chromium emulado, incluindo deslocamento observável do personagem.

## 4. Regressões completas e validação (O2, F5)

- [x] Acrescentar `community-kids/e2e-scenes/faisca-percursos.spec.ts`, compartilhando os helpers de `faisca-livres.spec.ts`, com conclusão das oito experiências e os três percursos alternativos de Cabana, Moedas e Símbolos. Usar controles e manifestos reais.
- [x] Formatar `gerar-ilha-do-farol.ts` e `video-experiencia.test.ts` e todos os arquivos alterados; executar Biome e `git diff --check`.
- [x] Executar suítes do motor/conteúdo, componentes compartilhados e players dos dois apps; typechecks e builds dos dois consumidores do member-shell.
- [x] Executar E2E de Faísca, experiências anteriores e moldura ampliada. Conferir manifestos/falas e atualizar notas de contrato e evidências do review.
- [x] Revisar o diff final, confirmar que não há alterações alheias e relatar os resultados e eventuais limites de ambiente.

## Resultado

F1–F5 e O1–O3 implementados. Validação: 4.137 testes unitários/integrados, 149 E2E,
builds completos de Kids e Community adulta (incluindo TypeScript), Biome sem erros e
`git diff --check` sem problemas. Evidências e limites registrados no relatório de referência.
O arquivo preexistente `docs/plans/2026-11-08-estudio-classico-redesenho-proposta.md` ficou fora
da alteração. A entrega autorizada é commit na branch de correção e merge em staging local.
