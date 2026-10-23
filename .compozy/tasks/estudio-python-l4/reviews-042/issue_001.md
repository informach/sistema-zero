---
status: resolved
file: packages/members/src/infrastructure/persistence/drizzle/content-admin.repository.ts
line: 825
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Exclusão do pai apaga a evidência de cadeia ainda não registrada

## Review Comment

A migração 0130 cria o registro durável vazio, e as cadeias preexistentes são registradas sob demanda durante publicação ou CRUD de blocos. Porém `deleteLesson` (linhas 819–831) e `deleteModule` (686–707) apagam os pais sem antes registrar as cadeias contidas neles. O lock de curso em `preserveShowcase` serializa a exclusão, mas não conserva essa evidência. O cascade remove os blocos e também suas baselines; uma publicação posterior já não encontra o ambiente anterior e aceita o mesmo nome para outro ambiente no mesmo curso.

Reprodução independente: `bun .cache/studio-python-l0/review042-delete-parent.ts`, exit 0. O harness usa `BlockAdminService`, o repositório fake que espelha esses caminhos e uma cadeia JS v2 preexistente, ainda sem entrada no registro novo. O controle recusa criar `jogo` Python enquanto a aula original existe. Após `deleteLesson`, a mesma criação é aceita. Um segundo caso repete o resultado pela exclusão pública de módulo (`ModuleAdminService.remove`), mantendo outra aula no mesmo curso. A implementação SQL tem a mesma ausência antes dos `DELETE`; esta revisão não executou SQL em paralelo à suíte ativa do implementador.

Antes de excluir a aula ou o módulo, sob o mesmo lock de curso e na mesma transação, registrar as cadeias atingidas usando a projeção compacta de ambientes, incluindo blocos arquivados e histórico de baselines que será removido. Um histórico ambíguo deve continuar podendo ser retirado com ambiente nulo, sem liberar o nome. Evitar carregar fontes/assets para essa coleta. Acrescentar regressões SQL de exclusão do último pai antes do primeiro registro, verificando que a exclusão ocorre, mas a reutilização incompatível permanece recusada e um rollback não altera o registro.

## Triage

- Decision: `FIXED`
- Notes: Implementador adicionou `preserveStudioChainsForLessons` antes dos cascades de aula/módulo, dentro da transação que já possui o lock de curso. O helper coleta somente nomes nos blocos e nas baselines e reaproveita a projeção compacta de ambientes de `claimStudioChains`; inclui blocos arquivados. Fake alinhado. O índice por `course_id` das baselines foi acrescentado pela migração aditiva 0131, sem modificar 0130. Revisor não alterou código de produção.

## Revalidation

- `bun .cache/studio-python-l0/review042-delete-parent-revalidate.ts` — exit 0, quatro cenários independentes. Após excluir aula ou módulo, Python não reutiliza a cadeia JS v2; JS compatível continua aceito. Histórico ambíguo permite excluir o pai, mas o nome continua recusado para ambos os ambientes. A prova original do bypass permanece no arquivo separado `review042-delete-parent.ts` como evidência da versão anterior.
- `bun test tests/unit/studio-chain-environment.test.ts tests/unit/studio-authoring-policy.test.ts tests/integration/studio-authoring.test.ts` em `packages/members` — execução independente após a correção: 16 pass, 0 fail, 100 verificações.
- Inspeção dos dois caminhos SQL confirmou `preserveShowcase` adquirindo `courses FOR UPDATE` antes da coleta e do cascade, tudo dentro da mesma transação. A coleta transfere nomes; `claimStudioChains` transfere apenas referências projetadas. As tabelas de baselines/bindings não são reescritas por esse registro.
- Leitura independente de `tests/db/studio-lesson-baseline.test.ts` e do log do implementador `.cache/studio-python-l0/l6-authoring-chain-db-2.log`: 14 pass, 0 fail, 85 verificações. Os novos casos SQL removem o último pai e comprovam que os nomes atual e anterior (este presente somente na baseline) continuam protegidos; a criação JS compatível é aceita. O revisor não repetiu SQL durante o typecheck ativo. O log inclui notices das migrações históricas, sem falhas de teste.
- A repetição específica do migrador real para o intervalo 0129–0131 permanece uma verificação separada do implementador; este fechamento se limita ao defeito de perda da evidência na exclusão.
