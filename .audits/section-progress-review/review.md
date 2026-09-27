Review de 10/09/2026: progresso e bloqueio sequencial de seções.

Os três achados foram corrigidos e verificados. As alterações e os resultados estão em [correcoes.md](correcoes.md). O registro abaixo descreve o estado encontrado durante o review, antes das correções; `regressions.log` preserva as falhas originais e `regressions-green.log` registra as três reproduções aprovadas após os ajustes.

1. **[P1] A verificação da seção não aceita o formato atual do projeto do Estúdio.**

   Em [section-progression.service.ts:208](C:/Users/tocha/projects/sistema-zero/packages/members/src/application/learning/section-progression.service.ts:208), o novo fluxo usa `gradeStudioActivity` diretamente. Esse avaliador extrai somente `ir.js` em [studio-activity.ts:153](C:/Users/tocha/projects/sistema-zero/packages/members/src/domain/course/studio-activity.ts:153). O Estúdio atual produz IR versão 2, com instruções em `behavior.start`, `behavior.events`, `behavior.loops` e, quando presente, `behavior.molds`.

   Reproduzi as quatro regras oferecidas na autoria: `usesLoop`, `declaresVariable`, `definesFunction` e `callsFunction`. O avaliador real do Estúdio aprova o projeto; a API de `project-check` responde `passed: false` e mantém a seção incompleta. O mesmo programa convertido para o formato anterior passa na API e libera a próxima seção. O teste existente usa justamente o formato anterior, por isso não detecta a incompatibilidade.

   A correção precisa considerar os dois formatos de IR e verificar a equivalência entre os avaliadores com projetos no formato atual. Os dois estágios estruturais dos 27 manifestos adaptados usam `usesBlock`; esta reprodução não demonstra falha nesses estágios específicos.

2. **[P2] Quizzes opcionais de apoio ficam impossíveis de responder.**

   Em [section-progression.service.ts:185](C:/Users/tocha/projects/sistema-zero/packages/members/src/application/learning/section-progression.service.ts:185), a autorização de envio exige que o bloco pertença aos `blockIds` de uma seção. `SubmitQuizAttemptService` passou a usar essa autorização. Um quiz formativo, sem `passingScore`, pode pertencer a `supportBlockIds`: a leitura o entrega ao aluno e o player o apresenta em Materiais de apoio, mas o envio retorna HTTP 423, `SECTION_LOCKED`.

   Reproduzi a recusa tanto no começo quanto depois de concluir todas as seções. O mesmo quiz funciona com HTTP 200 quando os critérios por seção são retirados, mantendo o restante da configuração. A importação também pode produzir esse caso, pois preserva blocos opcionais existentes como apoio.

   A autorização do quiz precisa considerar o apoio acessível sem liberar a entrega antecipada de projetos compartilhados. Material opcional deve continuar utilizável sem contar para a conclusão.

3. **[P2] Marcar uma seção como fechamento permite antecipar a entrega ao reordená-la.**

   Em [section-progression.ts:134](C:/Users/tocha/projects/sistema-zero/packages/core/src/learning/section-progression.ts:134), a validação confere `intent === 'closing'`, mas não a posição da entrega em relação às etapas que reutilizam o projeto. A autoria permite mover essa seção para cima.

   Reproduzi uma seção de fechamento em primeiro lugar, com duas etapas posteriores usando seu Estúdio. `sectionCompletionIssues` retorna uma lista vazia e a API aceita a entrega com HTTP 200 antes de qualquer construção. A conclusão integral da aula continua bloqueada, mas a regra de reservar a entrega para depois do trabalho é quebrada.

   A validação precisa conferir a ordem efetiva do percurso e impedir que a entrega anteceda as etapas de preparação/construção do mesmo projeto. Os manifestos adaptados inspecionados mantêm o fechamento no fim; o problema aparece ao configurar ou reordenar o percurso.

Executei novamente 81 testes existentes relacionados à mudança, todos aprovados:

| Pacote | Arquivos exercitados | Testes |
| --- | --- | ---: |
| Core | `learning.test.ts`, `section-progression.test.ts` | 37 |
| Members | Integração de atividades, importação e progressão por seção | 19 |
| Member shell | `learning-routes.test.ts` | 5 |
| Admin | Critérios, sincronização de importação e sessão do rascunho | 9 |
| Kids | `lesson-sections.test.tsx` | 11 |

Os [três testes adicionais](regressions.test.ts) falham nas expectativas que reproduzem os achados acima; são 26 asserções, incluindo controles positivos. O [log completo](regressions.log) registra os resultados. Reprodução, a partir da raiz do repositório:

```powershell
bun test ./.audits/section-progress-review/regressions.test.ts
```

Também conferi os contratos, critérios, referências e localização dos 27 manifestos usando [manifests.ts](manifests.ts):

| Repositório | Manifestos | Versão | Seções com critérios |
| --- | ---: | ---: | ---: |
| `sistema-zero` | 27 | 3 | 226 |
| `sistema-zero-aulas` | 27 | 2 | 0 |

Portanto, as adaptações estão em `sistema-zero/docs/aulas-interativas`. Ainda não foram levadas para `sistema-zero-aulas`.

A revisão abrangeu regras compartilhadas, leitura e escrita da API, persistência e migração, publicação/importação, player, autoria e conteúdo adaptado. As reproduções HTTP usam os repositórios em memória da suíte; as verificações de interface usam DOM de teste. O percurso com autenticação e mídia em navegador real continua sem validação. A migração e a publicação das aulas em produção também continuam pendentes, conforme o relatório anterior de implementação.
