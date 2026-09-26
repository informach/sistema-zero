# Verificação para o staging — 26/09/2026

## Resultado

O conjunto local de alterações foi revisado antes do commit. Lint, tipagem, suíte global sem o Postgres local, testes de banco dedicados e validadores de aulas passaram. O curso **Cadê Todo Mundo?** continua com vídeos planejados e não deve ser publicado para alunos antes da gravação, da importação no admin e do ensaio autenticado no navegador.

## Evidências automatizadas

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Dependências | `bun install --frozen-lockfile` | PASS |
| Lint e formato | `bunx biome ci . --reporter=summary --colors=off` | PASS; 11 avisos e 92 informações não bloqueantes em arquivos legados/locais |
| Tipagem | `bun run --filter '*' typecheck` | PASS em todos os pacotes; Members e Referrals repetidos após os ajustes finais |
| Suíte global, sem banco local | `bun run --filter '*' test` com `DATABASE_URL` apontando para uma porta local fechada | PASS; replica a fase global do CI, na qual os testes de banco opcionais são pulados |
| Banco real: Members | `cd packages/members && bun test tests/db` | 111 PASS, 0 FAIL |
| Banco real: Referrals | `cd packages/referrals && bun test tests/db` | 17 PASS, 0 FAIL |
| Banco real: Fiscal | `cd packages/fiscal && bun test tests/db` | 12 PASS, 0 FAIL |
| Banco real: Auth | `cd packages/auth && bun test tests/db/repositories.test.ts` | 11 PASS, 0 FAIL |
| Grant do Mural | `cd packages/members && bun test tests/application/grant.test.ts` | 26 PASS, 0 FAIL |
| Importação de manifestos | `cd packages/members && bun test tests/integration/learning-import.test.ts tests/integration/nave-e-desafio-import.test.ts` | 10 PASS, 0 FAIL |
| Curso Cadê Todo Mundo? | `bun test docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts` | 16 PASS, 0 FAIL |
| Manifestos | `bun docs/aulas-interativas/qa/validar-manifestos.ts` | 34 válidos, 0 reprovados |
| Roteiros | `python docs/aulas-interativas/validar-roteiros.py` | 195 sessões validadas; notas de tempo antigas não bloqueantes |
| Alcance Kids | `bun run --filter @sistemazero/community-kids test:reachability` | PASS; todos os módulos críticos alcançados |
| Runtime Studio | `bun run --filter @sistemazero/studio-runtime audit:image` e `build:image` | PASS; 0 vulnerabilidades e imagem construída |
| Exemplos 3D | `bun run --filter @sistemazero/studio check:game-3d-examples` | PASS; 28 exemplos atualizados |
| Integridade do diff | `git diff --check` | PASS |

Os testes de banco foram executados **separadamente**, como no CI. Uma execução local com todos os pacotes disputando simultaneamente o Postgres da porta 5433 apresentou timeouts de 5 segundos em Auth, Fiscal e Referrals; as suítes dedicadas acima passaram sem timeout. Esse resultado local concorrente não foi contado como aprovação.

## Review e correções

- A cena nova de contagem foi verificada no núcleo, no player, no contrato HTTP e nos testes de manifesto/projeto.
- O teste da moldura de experiências ainda esperava o nome antigo do botão de recomeçar. A expectativa foi atualizada para os nomes acessíveis reais de cada cena; a suíte Kids terminou com 1.102 testes passando.
- Os testes de importação passaram a estreitar o conteúdo como Estúdio, sem esconder incompatibilidades de tipo com `unknown`.
- Em Referrals, `markRedemptionGranted` enviava um objeto `Date` por um fragmento SQL que o driver não serializava. O parâmetro agora é ISO com tipo `timestamptz`; os 17 testes de banco passaram.
- A fixture de banco do Members não acompanhava a coluna `journey_role`; foi atualizada e os 111 testes de banco passaram.
- O gerador de sprites agora entrega TypeScript formatado. Duas execuções produziram o mesmo hash.
- O novo caderno foi regenerado e suas quatro páginas A4 foram renderizadas e inspecionadas: sem texto cortado, sobreposição ou campos não preenchidos. O mapa antigo não tem referências restantes.

## Cobertura de interface e pendências

Há Playwright para Community Kids e Studio no CI. Nenhum fluxo autenticado novo foi executado em navegador local nesta revisão; os E2E do push de `staging` e a verificação dos serviços no Railway são evidências posteriores ao commit. A publicação do curso para crianças permanece pendente de vídeos, anexos no admin e ensaio real de toque, envio, compartilhamento e certificado. Não há caso `TC-*.md` ou bug `BUG-*.md` criado nesta revisão.
