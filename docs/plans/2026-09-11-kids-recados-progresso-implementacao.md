# Recados e progresso Kids — implementação aprovada

Base: [.audits/architectural-analysis-2026-09-11-kids.md](../../.audits/architectural-analysis-2026-09-11-kids.md). O usuário pediu a implementação em 11/09/2026 e confirmou os públicos individual, curso e todos do Kids.

**Remediação de 12/09/2026:** os sete achados do [full review](../../.audits/architectural-analysis-2026-09-12-kids-full-review.md) foram corrigidos e receberam testes de regressão. O relatório registra a solução de cada achado e a verificação posterior, separada da validação inicial abaixo.

- [x] Corrigir exposição de project-check no gateway e tornar os critérios da seção a fonte explícita de obrigatoriedade, preservando exigências publicadas por migração.
- [x] Corrigir o escopo de leitura em lote e incluir filtro de dúvidas; separar pendência da equipe de leitura pessoal.
- [x] Implementar público resolvido pelo servidor, composição individual/coletiva, lista persistida de destinatários, processamento retomável e acompanhamento de envios.
- [x] Implementar ajuda idempotente com contexto, atalhos de ida/volta e atualização de contadores.
- [x] Simplificar autoria por modelos, catálogo de blocos e parâmetros; mostrar feedback por objetivo e simulação sem progresso real.
- [x] Fortalecer verificações estruturais, preservar evidências por revisão e reunir acompanhamento do professor; adaptar objetivos práticos dos manifestos.
- [x] Validar migrações em banco descartável, testes de regressão, tipos, lint, builds e fluxos de interface por testes de componentes.
- [x] Corrigir R1–R7: exclusão concorrente, compatibilidade legada, critérios possíveis, sombras, simulação atualizada, polling de destinatários e histórico paginado.

Restrições: preservar as alterações já presentes no workspace em lesson-sections.tsx; não enviar mensagens reais; não aplicar migrações em produção ou publicar aulas. Mudanças compartilhadas devem manter a comunidade adulta funcional.

Implementação concluída no workspace. As alterações de layout/progresso que já estavam em andamento foram preservadas. Nenhum envio real, publicação de aula ou deploy foi feito.

## Comportamento entregue

**Recados:** Novo recado aceita um perfil, alunos com acesso efetivo a um curso Kids ou todos os perfis ativos com acesso Kids. Busca por criança/responsável, editor rico, modelos, prévia com público paginado e confirmação. O servidor fixa os destinatários; novos alunos não recebem retroativamente. Enviados mostra entregas, falhas e leitura, permite repetir falhas e abrir cada conversa privada. Respostas dos alunos entram na caixa; o envio inicial fica agrupado em Enviados. O workflow da equipe tem Aguardando professor, Aguardando aluno e Resolvido, independente da leitura pessoal. Filtro de Dúvida na aula e leitura em lote respeitam os mesmos filtros da lista.

**Ajuda:** continua na mesma caixa de Recados. Cada pedido inclui a seção, revisão e pendências daquele momento. Repetir o mesmo pedido após perda da resposta de rede reutiliza o identificador, sem duplicar a mensagem. A confirmação oferece Ver conversa; a conversa oferece Voltar à seção, respeitando o acesso. Contadores atualizam ao ler/responder, navegar e recuperar foco, com atualização periódica durante uso ativo.

**Verificação:** os critérios selecionados são a fonte de obrigatoriedade da seção. O editor explica os tipos compatíveis e oferece catálogo de blocos, área, encaixe e parâmetros. A simulação com arquivo do projeto usa o mesmo avaliador sem gravar progresso. Blocos soltos/desativados e valores substituídos não satisfazem objetivos. A criança recebe resultado individual por objetivo; o avanço só reflete gravação confirmada no servidor. Quizzes selecionados como critérios permitem tentativa imediata. Recompensas e marcos já conquistados continuam preservados.

**Acompanhamento:** guarda evidências por revisão para checkpoints de projeto, quizzes e entregas do Estúdio. O professor consulta progresso, pendências, respostas e resultados; pode baixar o snapshot completo da evidência. A publicação invalida o resultado corrente quando necessário, mas mantém o histórico. Os manifestos iniciais de Corre, Dino! e Desafio do Primeiro Jogo têm cinco objetivos práticos novos de tela, personagem e repetição.

## Verificação final

Executada no código implementado, em ambiente local. Logs completos em `.audits/kids-flows-2026-09-11/` (logs ignorados pelo Git).

| Camada | Execução | Resultado |
| --- | --- | --- |
| Members | `bun test tests/unit tests/integration` | 880 passaram |
| Kids | `bun test tests` | 746 passaram |
| Member shell | `bun test` | 474 passaram |
| Community adulta | `bun test tests` | 5 passaram |
| Core | `bun test` | 103 passaram |
| Auth | `bun test tests/integration/http-server.test.ts` | 101 passaram |
| Gateway | `bun test tests/unit/config.test.ts` | 28 passaram |
| Studio | estrutura, correção e catálogo | 24 passaram |
| Admin | composição coletiva, critérios e acompanhamento | 5 passaram |
| PostgreSQL | `kids-recados.test.ts` | 3 passaram |
| PostgreSQL | `learning-migrations.test.ts` | 20 passaram |

- TypeScript passou em Core, Auth, Gateway, Members e Member shell. Os builds de Admin, Kids e Community passaram, incluindo a verificação TypeScript do Next.
- Biome passou nos 77 arquivos de código/JSON alterados pela implementação; `git diff --check` passou. Arquivos de trabalho paralelo não foram incluídos na formatação em lote.
- `bun run db:generate` no Members confirmou ausência de divergência entre schema e migrações.
- A suíte de migração criou bancos vazios descartáveis em PostgreSQL local, aplicou a cadeia real e importou os 27 manifestos. Confirmou preservação dos rascunhos após conversão de critérios, publicação concorrente, marcos e isolamento por perfil.
- Recados em banco real: só entrega após confirmação; dois workers concorrentes não duplicam; falha injetada na mensagem reverte a conversa daquele destinatário; retry entrega uma vez; respostas privadas, leitura individual e workflow mantêm o isolamento. O público foi exercitado com 205 perfis distribuídos em páginas, sem depender de conversas prévias.
- Interface do admin: teste com React/DOM real e rede simulada percorreu público coletivo, modelo, revisão, destinatários, confirmação e Enviados. Player e acompanhamento têm testes de componentes. Não houve percurso autenticado no navegador; a tentativa de abrir o admin local encontrou o serviço desligado.

Para repetir os testes em banco descartável, executar na raiz:

```powershell
bun .audits/kids-flows-2026-09-11/run-db.ts tests/db/kids-recados.test.ts tests/db/learning-migrations.test.ts
```

O script usa exclusivamente PostgreSQL local em `localhost:5433`, cria bases `sz_aulas_qa_kids_*` e remove as que passam. Não usa a URL de produção.

## Ativação e limites

1. Aplicar `0084_kids_recados_evidence.sql` e `0085_explicit_section_criteria.sql` pelo migrador normal do Members antes de iniciar o servidor novo. Ambas foram geradas pelo fluxo Drizzle; a segunda é a migração customizada de dados. Ela torna exigências anteriores explícitas, rebaseia rascunhos e preserva evidências disponíveis.
2. Publicar Auth, Members e Gateway com os novos contratos antes das interfaces. O worker de recados roda no Members e persiste o trabalho; não exige serviço externo de fila.
3. Validar em staging com perfis de teste os públicos, ajuda/resposta e uma aula por modalidade. Não usar destinatários reais no teste de envios.
4. Importar/revisar e publicar os manifestos alterados pelo fluxo de autoria quando se desejar ativar os novos objetivos práticos. A edição dos arquivos locais não publica aulas existentes automaticamente.

Verificação estrutural comprova a estrutura/configuração enviada, sem executar o jogo no servidor. Checagens legadas de comportamento/código ainda registram a origem do resultado do cliente; o editor/publicação recusa usá-las como nota obrigatória de seção. Sandbox de execução, avaliação visual do Pinta e aprovação/dispensa humana como novo critério são possibilidades futuras citadas na investigação e não fazem parte desta entrega. O professor continua podendo acompanhar e responder às entregas criativas.

Enviados lista os 50 envios mais recentes; destinatários de cada envio são paginados. Novas matrículas não recebem avisos antigos, e leitura registrada indica abertura da conversa.
