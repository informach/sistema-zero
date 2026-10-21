# Handoff Aulas/Admin/Salas — 2026-10-21

Estado: **HOLD; sessão liberada para encerramento; sem novos testes/serviços.** Root solicitou transferência para máquina mais potente. Este relatório é continuidade, não autorização de execução.

## Identidade e integração

- Owner UUID: `01a15a51-df0d-7841-95cb-795fc949dbb0`; coordenador: `01a1452d-122a-7431-bc02-60003832b618`.
- Worktree: `C:/Users/tocha/projects/sistema-zero-python-lessons`; branch `feat/studio-python-lessons-acceptance`; HEAD `b763fb6e1773a122188fe37fa044b142c9442f62`.
- Antes deste relatório, `git status --porcelain=v1` vazio. Este relatório será arquivo novo não commitado; nenhum source foi alterado na preparação recente.
- Root observado: `C:/Users/tocha/projects/sistema-zero-python`, HEAD `5503f6a245d2f2434fc91289fba05bbf6f229f29`; origin/staging `8c0bb250dc7660869c247f799f126e99e0e93d9c`.
- Código QA original integrado pelo Root em `b641c62916fedc9b08c145fba979a7b60716a75f`; agora reconfirmado `git merge-base --is-ancestor b641c629 HEAD` no Root: exit0. Não reaplicar patch.

## Feito e evidências

Lote original: producer de estrutura isolada, cenários Admin/Kids Python, admissão e operadores; 13 arquivos QA, 1111 adições/23 remoções, sem alterações de produção. Revisão independente e correções P2 encerradas: fechar contexto antes de drenar listeners; publicação atômica de conclusão; falhas de monitor persistem NEG e reconciliam os objetos possuídos; descendentes usam handles retidos; observação desconhecida nunca vira PASS/kill por PID reaproveitado. Operador CIM antigo é histórico; fluxo hospedado posterior usa owner nativo do Root.

Evidência histórica própria: 27 testes/166 asserts no commit9eda, incluindo cleanup. Root reportou 22 testes/136 asserts em2 arquivos para integração b641, além de13 controles benignos de ownership/monitor, parsers/diffcheck; resultados não reexecutados neste handoff. Detalhes/recibos estão no manifesto. Não somar resultados de escopos/commits diferentes nem declarar PASS atual por isso.

Última tarefa autorizada foi preparação em cache do menor JS Pro hospedado: proposta, plano, diff de um producer não aplicado, 34 pins de revisão conferidos contra Root5503 e recibo. `git apply --check .cache/hosted-js-lesson-prep-r1/producer-https-audience.proposed.diff` teve exit0 na preparação, sem aplicação, compilação ou testes. Não existe novo leaf implementado, seal ou cenário hospedado aprovado/executado. RuntimeWorker9e33/imagem26b/build52 e CI/deploy green foram informações do Root, não provas executadas por Lessons.

## Pendências priorizadas

1. Root revisar `PROPOSAL.md`, `PLAN.md`, diff e pins em `.cache/hosted-js-lesson-prep-r1`. Recomendação ainda não confirmada: aula **adult recorded**, dois atores novos admin/customer; não equivale ao aceite separado Kids/Python.
2. Duas ressalvas da auto-revisão ficaram abertas quando veio HOLD: (a) a proposta diz capturar oldVite via publicação antes de preparação, mas a preparação pode ocorrer antes de publicar; capturar o request real de preparação/árvore pré-reparo, e comparar a publicação ao estado canônico pós-reparo; (b) confirmar no callsite o itemId real da nuvem; não assumir blockId sem observar o request. Estes pontos NÃO foram corrigidos/implementados após HOLD.
3. Binding fresco HTTPS exato Admin+Community e tuples Auth/Admin/Members/Community; origem Admin não determinada. Novo contrato canônico de dois atores: creator atual só permite staff, insuficiente ao BFF Admin; learner precisa customer para provar entitlement. Não promover conta existente, não usar superadmin, não escrever SQL ad hoc nem copiar credenciais.
4. Verificar presença de STUDIO_PRO_RUNTIME_URL/TOKEN nos dois BFFs sem expor valores. Reusar Node24/native Windows Job/external Chrome e provider privados do Root; revisar custódia de dois atores e orçamento por fase. Nenhum novo owner framework.
5. Após revisão/implementação autorizadas: leaf fino para autoria real, publicação/readback, concessão do curso próprio via BFF (`courseRef=slug`), learner em `/cursos/<slug>/aulas/<lessonId>`, iframe remoto, salvar/reabrir e reserva stale409/CREATION_STALE_BASE. Curso/conteúdo QA próprios; sem alterar currículos existentes.
6. StudioLesson desliga export/download: ZIP canônico auditado por exportador existente é proposta, não download da UI. Se botão ZIP for requisito, é lacuna a decidir. Runtime de aula gravada não aceita expectedWorkspaceRevision; não atribuir stale409 do live ao compilador gravado. Editor Pro livre continua WebContainer/terminal/HMR; alvo novo é runtime remoto já existente da aula.
7. Primeiro aceite real Admin→Kids/Python continua PENDENTE. Antigos host/HTTP883/base022/seals/aprovações não são autoridade. Nova máquina exige paths, source closure, ferramentas, perfil, binding e janela novos, com execução serial e menor stack possível.

## Recursos, limites e credenciais

Nenhum serviço/browser/Docker/TSC/build/processo de execução foi aberto pela preparação atual; nenhum recurso Lessons retido segundo o último encerramento. Não foi feita varredura global para afirmar ausência de processos de outras frentes. HOLD solicitado pelo Root: não iniciar testes/serviços nem implementar/push.

Dependências futuras: Node24, Chrome/Playwright/libs e owner nativo/Windows Job com pins frescos; runtime remoto; Auth/Admin/Members/Community hospedados; credenciais de provider/serviço e duas credenciais QA novas sob custódia em memória/STDIN existentes. **Nenhum valor secreto, token, cookie, env ou log bruto acompanha este pacote.** Os registros antigos de ownership/teste permanecem no cache original, não selecionados para cópia automática.

Perfil hospedado existente é funcional, não desempenho qualificado; abort>2GiB anterior permanece NEG. Limites atuais a rever pelo Root: work300/soft330/drain355/emergency-reconcile360s; BFF timeout55s; um Chrome com contextos seriais, sem Next/PG/host local. Sem mínimo genérico4GiB; admissão depende pico/headroom medidos. Não aumentar envelope/repetir OOM/NEG por conta própria.

## Continuidade: lista exata e SHA

Manifesto exato: `C:/Users/tocha/projects/sistema-zero-python-lessons/.cache/hosted-js-lesson-prep-r1/continuity-manifest.json`; SHA256 `1d7e89308e0f63698dd9ee168dcc4cf99f083bba0d5d2203d83f9ffaf0dd8728`. Contém paths/tamanhos/SHA de todos os arquivos abaixo, dos13 QA integrados e dos34 inputs Root de revisão (referências somente). Estes inputs precisam ser reconciliados com a máquina/HEAD de destino; manifesto não é seal. Não copiar `.cache` inteiro ou dados secretos.

Arquivos próprios essenciais (relativos à worktree):

- `.cache/hosted-js-lesson-prep-r1/diff-check.log` — SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `.cache/hosted-js-lesson-prep-r1/pins.json` — SHA256 `dec12bbd53c3d71d3b3b720a42ef3e73f64b1e679d12345ab7bc76b3041ffbf7`
- `.cache/hosted-js-lesson-prep-r1/PLAN.md` — SHA256 `04c27f1f08d32e56057caf94f38e3a57df3438aaad372b4cc535cba9d5b5c0cf`
- `.cache/hosted-js-lesson-prep-r1/preparation-receipt.json` — SHA256 `54938a4f5e8d88b82df04438acb4283bd9795ec388aa16b212e2be5db04d6672`
- `.cache/hosted-js-lesson-prep-r1/preparation.log` — SHA256 `758b66f33cd4cb61ff3abee3a0e446fbe77ab1cc700723a6e0508e5bd347d6eb`
- `.cache/hosted-js-lesson-prep-r1/prepare_review.py` — SHA256 `c874d1396bf4648fce7dbdc0aca2fb7c62a7b06870cfffba34f86416df8449d3`
- `.cache/hosted-js-lesson-prep-r1/producer-https-audience.proposed.diff` — SHA256 `6fd65882cd0ea783cdd4915173bd971bc7d3544495d7a008a02ba76f4a75be86`
- `.cache/hosted-js-lesson-prep-r1/producer-https-audience.proposed.ts` — SHA256 `8d3c6ff09b8df03737cd96e8d387a022cb2c8364eea435a7b968e2b9b3f91340`
- `.cache/hosted-js-lesson-prep-r1/PROPOSAL.md` — SHA256 `1ce0121ea00ba7692804024f48b67f74cf2408232ee52d972c3979d47d418376`
- `.cache/lessons-integration-r4/qa-lot.patch` — SHA256 `0cd632bb551f900c02e721b253effff09427c2e860d634d920fb7fd8577e4edf`
- `.cache/lessons-root-b641-composition-r1/HANDOFF.md` — SHA256 `3b75b395c8ebbbec0e85e8ae51f0796d8167f96499d5a77d0cefbee44bc9e556`
- `.cache/lessons-root-b641-composition-r1/REVIEW.md` — SHA256 `d31bf58775b39f380c67853002f93f1b9a11104d7b7119fc9b9b9bb8c98b63d5`
- `.cache/lessons-root-b641-composition-r1/future-composition.json` — SHA256 `49a1f0d71b8930f04114e711c3d7ba82fdeadcb41cea33462102e420b252078e`
- `.cache/lessons-root-b641-composition-r1/receipt.json` — SHA256 `4cdb41d8dd35c4124bfddafd45be5e6444f2e2171a8aad3c1eff989cb66452dc`
- `.cache/lessons-observation-r1/REVIEW.md` — SHA256 `997776120e67f7df80bbd78184407e9100d7b27a382499c62c481a8133f8642d`
- `.cache/lessons-observation-r1/receipt.json` — SHA256 `534ae135a71783356f9125a673b2eb9c154f233482d98f713a23c6085c08933f`
- `.cache/lessons-observation-r1/powershell-minimum-receipt.json` — SHA256 `35fdead5eec536c0efdb48c74567806f8a0f37222e125ee8d55a230fdfbc7701`

Fontes integrados essenciais (já no Git Root; obter pelo checkout, não pelo patch):

- `packages/admin/tests/e2e/python-lesson-fixture.ts`
- `packages/admin/tests/e2e/python-lesson-retained-handle-control.ps1`
- `packages/admin/tests/e2e/python-lesson-supervisor-control.ps1`
- `packages/admin/tests/e2e/python-lessons-acceptance.md`
- `packages/admin/tests/python-lesson-admission.test.ts`
- `packages/admin/tests/python-lesson-fixture.test.ts`
- `packages/community-kids/tests/e2e/python-lesson-admin.ts`
- `packages/community-kids/tests/e2e/python-lesson-admission.ts`
- `packages/community-kids/tests/e2e/python-lesson-kids.ts`
- `packages/community-kids/tests/e2e/windows/python-lesson-browser-owned.ps1`
- `packages/community-kids/tests/e2e/windows/python-lesson-browser-watch.ps1`
- `packages/community-kids/tests/e2e/windows/python-lesson-process-ownership.ps1`
- `packages/community-kids/tests/e2e/windows/python-lesson-windows-entry.mjs`

## Comandos exatos para recepção/revisão

Somente revisão de metadados/bytes; nenhum Start:

```powershell
Set-Location -LiteralPath C:/Users/tocha/projects/sistema-zero-python-lessons
git rev-parse HEAD
git status --short
Get-FileHash -Algorithm SHA256 -LiteralPath docs/superpowers/plans/2026-10-21-handoff-aulas.md
Get-Content -LiteralPath .cache/hosted-js-lesson-prep-r1/continuity-manifest.json
Set-Location -LiteralPath C:/Users/tocha/projects/sistema-zero-python
git merge-base --is-ancestor b641c62916fedc9b08c145fba979a7b60716a75f HEAD
git show --stat b641c62916fedc9b08c145fba979a7b60716a75f
```

Depois de nova autorização, os comandos históricos de teste estão no handoff b641; não são START concedido agora. Não há comando de browser pronto/autorizado para a proposta hospedada: dependências acima são reais.

## Entrega

Relatório e status preparados para leitura direta pelo Root. Tentativas anteriores de comunicação: MCP127.0.0.1:59341 indisponível e `codex queue` no limite100. Não requisitar que o usuário transporte recados; Root pode ler este caminho compartilhado. Nenhum commit/push ou alteração na worktree Root realizado por Lessons.
