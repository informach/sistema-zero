# Verificação do progresso das seções

Implementação de 10/09/2026, conforme o [plano aprovado](2026-09-10-progresso-secoes.md).

## Comportamento implementado

- Visita, navegação, posição do vídeo e rascunho não são evidência de conclusão.
- A API confirma perguntas, ordenação/associação e critérios estruturais do projeto. O índice libera uma seção por vez e permite revisar marcos já concluídos.
- Conteúdo de seções futuras é retirado da resposta do aluno. Navegação, tentativas, entregas, downloads e recuperação de projetos verificam acesso à seção; a referência ao projeto contínuo permanece disponível onde foi configurada.
- A barra principal conta seções concluídas com pesos iguais. A entrega final fica no fechamento; a última seção é obrigatória para chegar a 100% e concluir a aula. Recompensas e desbloqueios existentes continuam vinculados à conclusão da aula.
- Erros de salvamento mantêm a seção e o projeto. O botão de nova tentativa usa o destino original.
- Critérios são configuráveis no admin; a publicação recusa configurações incompletas, referências a outra seção e entregas antecipadas. Mover uma pergunta também move sua referência como critério.
- Aulas legadas mantêm seu fluxo até a adaptação. Aulas concluídas permanecem concluídas, sem converter posições antigas em marcos. A prévia da autoria não cria tentativas nem progresso de aluno.

Os 27 manifestos estão na versão 3. As 226 seções incluem 206 checagens pedagógicas, 2 etapas verificadas pela estrutura do projeto e 18 entregas no fechamento. Cada roteiro registra sua pergunta/resposta ou objetivo de projeto. Os 118 vídeos planejados continuam pendentes de produção e vinculação, como antes desta alteração.

## Evidências automatizadas

| Escopo | Comando no pacote | Resultado |
| --- | --- | --- |
| Core | `bun test` | 95 testes passaram |
| Members | `bun test` | 1.001 testes passaram; suíte de upgrade executada separadamente |
| Member shell | `bun test` | 472 testes passaram |
| Admin | `bun test` | 229 testes passaram |
| Kids | `bun run test` | 634 testes passaram |
| Community | `bun run test` | 5 testes passaram |
| Migração e publicação | `bun test tests/db/learning-migrations.test.ts` com banco descartável explícito | 19 testes passaram |
| Player após o ajuste de nova tentativa | `bun test tests/lesson-sections.test.tsx` em Kids | 11 testes passaram |
| Tipos | `bun run typecheck` em Core, Members, Member shell e Admin | Passaram |
| Builds de produção | `bun run build` em Admin, Community e Kids, após o ajuste final do player | Os três passaram, incluindo checagem de tipos e geração de páginas |
| Lint e formatação | `biome check` nos 85 arquivos de código/manifesto alterados | Passou |

A migração real foi aplicada em um banco vazio com nome `sz_aulas_qa_sections_*`. Os testes montaram o estado legado, aplicaram as migrações, importaram os 27 manifestos em rascunhos e verificaram concorrência, revisão desatualizada, marcos idempotentes, clonagem e exclusão de dados. O banco descartável foi removido após a execução bem-sucedida.

O teste de recuperação de navegação foi observado falhando ao usar **Tentar novamente**; após a correção, passou junto dos outros 10 testes do player. Os demais testes cobrem resposta errada, salvamento sem aprovação, acesso direto a uma seção futura, isolamento por perfil, retomada antiga, última seção obrigatória, entrega antecipada e preservação de aulas concluídas.

Os logs locais estão em `.audits/section-progress/`. O cache de tipos de desenvolvimento do admin tinha referências a rotas removidas anteriormente; o arquivo gerado antigo foi preservado nesse diretório e os tipos atuais foram regenerados pelo Next.

## Ativação e limites da validação

A migração `0082_section_progress.sql` cria somente a tabela de marcos por perfil/seção e seu índice. Não há conversão ou redefinição de progresso existente. Aplicar a migração antes de disponibilizar o novo backend, pelo fluxo habitual de implantação.

A nova regra de cada aula entra em vigor quando seu rascunho adaptado é publicado com critérios válidos em todas as seções. Os manifestos e roteiros estão preparados para essa publicação; esta execução não publicou aulas nem aplicou a migração em produção.

Não havia navegador disponível na sessão, confirmado pelo runtime de navegação. A inspeção visual ao vivo e o percurso completo com autenticação/mídia publicada permanecem sem verificação. A cobertura de interface acima usa DOM de teste; não equivale a uma sessão real de aluno.

O review posterior encontrou e corrigiu três casos não cobertos inicialmente: leitura da IR atual do Estúdio nas verificações estruturais, respostas a quizzes opcionais de apoio e entrega antecipada após reordenar o fechamento. A publicação e o envio agora exigem que a entrega pertença à última seção, marcada como fechamento. A verificação das correções aprovou 97 testes de Core, 1.008 de Members e as três reproduções originais; tipos e lint dos dois pacotes passaram. Os 21 casos/etapas da suíte de migração permaneceram pulados nesta rodada, sem banco descartável explícito. Evidências em `.audits/section-progress-review/correcoes.md`.
