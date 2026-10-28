# Correções e fechamento dos desafios do Arquipélago

Implementação autorizada em 28/10: corrigir todos os achados, completar Admin/Estúdio de desafios e corrigir a causa da falha do CI.

Arquitetura: snapshots imutáveis de publicação, revisão de escrita para mudanças de situação, ownership explícito dos recursos gráficos, política compartilhada de pausa. O desafio usa o Estúdio embarcado com política de aula e verificação no servidor; nunca concede o produto Estúdio Completo. Admin reutiliza os editores existentes e o tema da plataforma.

Spec: `docs/plans/2026-10-27-arquipelago-desafios.md`. Achados: `docs/reviews/2026-10-28-remote-arquipelago.md`.

- [x] R1/R2: regressões Postgres para rascunho/publicação/conclusões, ocupação de quadro e arquivamento concorrente; schema/migrações gerados, consultas e testes atualizados. Preservar histórico existente via backfill explícito.
- [x] R3: regressões de cancelamento durante preparação/compilação e liberação das duas famílias de materiais; corrigir ownership do loader/hook.
- [x] R4: mesma política de bloqueio no personagem e no cronômetro; testar todos os estados de pausa.
- [x] CI Windows: retirar compilação dinâmica por operação e diagnosticar prazo/fase do helper sem enfraquecer ACL, autenticação ou aceites negativos. Falha intermitente do runner original não reproduzida localmente; ver limites abaixo.
- [x] Host: aceitar molde de desafio, buscar revisão publicada, abrir Estúdio de desafio, preservar rascunho por pessoa/desafio/revisão, verificar no servidor, fechar/retomar com recompensa confirmada. Não expor gabarito.
- [x] Admin: rotas BFF autenticadas e item Jogo por público; lista/cadastro, inicial/gabarito, objetivos, dicas/extra, prêmios/blocos, análise, publicação, arquivar/reativar e cobertura. Erros de revisão não apagam edição local.
- [x] Verificação local integrada: testes focados, tipos e UI; revisão final; commits e conciliação sem alterações não commitadas de outras frentes. Evidência em `docs/reviews/2026-10-28-arquipelago-integration.md`.
- [ ] Após o push: acompanhar CI hospedado, configuração/ativação e fluxo autenticado em staging. Deploy não é certificado pelos testes locais.

Execução em worktree isolado `sistema-zero-review-remoto-20261028`, branch `fix/arquipelago-review-20261028`, base `742e9f66e`. O remoto e a árvore principal podem avançar; reconciliar antes da integração. Cada item só será marcado concluído com evidência fresca. Não reutilizar autoridade de testes antigos.

## Checkpoint anterior à conciliação do remoto

Implementados R1–R4, Admin Jogo, Estúdio de desafio e correção do helper Windows. Em 28/10, seleção atual: 196 testes passaram, zero falhas, 644 asserções (API incluindo Postgres real, contratos, lifecycle/pausa, autoria e host). Tipagem Admin, member-shell, agent-runtime e API passou. Suíte Windows completa: 64 testes, 381 asserções; helper conserva prazo de 10 s e ACL exclusiva do usuário, sem compilar C# a cada chamada. O log antigo não identifica a fase exata que excedeu o prazo; CI hospedado ainda precisa confirmar a correção.

Ensaio visual reproduzível: iniciar `bun --cwd packages/admin tests/visual/serve-game-authoring-preview.ts`; em outro terminal na raiz executar `node packages/admin/tests/visual/verify-game-authoring.mjs <URL-local-impressa>`. Reiniciar o servidor entre tentativas. Usa HTTP em memória e o Estúdio real: conflito 409 preserva edição, salva/analisa/publica, separa públicos, abre/fecha Estúdio com Blockly carregado e não transborda a 390 px. Passou; não substitui autenticação, executor ou implantação reais. Capturas ficam na `.cache/` da raiz.

Conciliação concluída com `origin/staging` em `0bfe3c51b`, registrada no merge `5e3ece7ea`. Verificações afetadas repetidas; tipagem integrada de Admin, member-shell, jogo e API passou. Migrações 0004–0006 foram aplicadas apenas no Postgres descartável. O backfill preserva o último metadado disponível de publicações antigas; metadados históricos nunca armazenados não podem ser reconstruídos.
