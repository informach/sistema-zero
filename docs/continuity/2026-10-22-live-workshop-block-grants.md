# Conquistas de blocos em oficinas — validação de 22/10/2026

Concluir a oficina concede os IDs JavaScript/Python configurados no curso. O evento
`live_course_complete` congela as recompensas na mesma transação do ledger,
inclusive em replay. Não exige Mural, acesso prévio ao Estúdio ou uma primeira
consulta da paleta. A concessão sobrevive à edição, despublicação e exclusão do
curso. Inscrição, acesso gratuito e presença não substituem a conclusão.

O acesso ao produto Estúdio Completo e as capacidades da Jornada/Ponte/Pro
continuam separados. Não há migração nem alteração de vagas, pagamento,
presença, XP, rank, roteiros ou jogos. Clones para ao vivo preservam o currículo.
No Admin, o mesmo seletor e a validação Python atendem cursos e oficinas.

## Verificação independente no worktree de integração

- Admin, formulário React real: `bun test tests/course-studio-blocks.test.tsx tests/course-modality.test.tsx tests/course-form-default.test.tsx` — **18 testes, 121 asserts, zero falhas**.
- Members, nove arquivos de serviços/HTTP/gamificação/Jornada — **198 testes, 792 asserts, zero falhas**.
- PostgreSQL 18 descartável, migrations reais, `LEARNING_QA_DATABASE_URL` explícita e `bun test tests/db/live-course-modality.test.ts` — **13 testes, 78 asserts, zero falhas e zero skips**. Inclui Kids/Adult, replay antes de GET, persistência após excluir curso, rollback conjunto evento/grant/perfil e recusa de evento/modalidade/audiência incorretos.
- Tipagem completa incremental de Admin e Members com TypeScript 5.9.3/Node 24.22: **exit 0**.
- Biome nos 21 arquivos TypeScript alterados e `git diff --check`: **exit 0**.
- Review independente do diff congelado sem P1/P2 concreto; revisão estática complementada pela execução SQL acima.

O container exclusivo de QA foi identificado por ID e label, encerrado e removido.
Os serviços locais preexistentes foram preservados. Nenhum banco remoto foi
utilizado pelos testes. Não se atribui a este lote uma execução de navegador
completo, homologação de runtime hospedado ou ativação do catálogo Python.

## Entrega

Integração e CI remoto serão registrados após a publicação. O CI anterior
`39788445700`, referente a `85e942a23`, falhou em um teste de assistência Python do
Member Shell: a fixture atual de áudio não declara `assist`, mas o teste positivo
esperava autorização. O gate produtivo recusava corretamente. O teste agora
constrói uma release com assistência explícita e prova que áudio sem assistência
recebe 403 sem reserva de crédito ou chamada ao modelo. Sem mudança produtiva.
Reprodução isolada: 11 passaram/1 falhou; verificação independente após ajuste:
**97 testes, 486 asserts, zero falhas** nos três arquivos Zappy.
