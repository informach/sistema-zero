Correções dos três achados do review, verificadas em 10/09/2026.

- O avaliador do servidor lê tanto a IR legada (`ir.js`) quanto as áreas da IR atual (`behavior.molds`, `start`, `events` e `loops`). No formato atual, conteúdo antigo em `ir.js` não serve como evidência. As quatro regras de repetição, variável e função aprovam o mesmo projeto que o avaliador do Estúdio aprova.
- O quiz usa a autorização de acesso ao conteúdo. Quizzes opcionais de apoio podem ser respondidos antes e depois das seções; essa resposta não conclui nenhuma seção. Quizzes futuros continuam bloqueados.
- A publicação e o envio compartilham a regra `isFinalProjectSection`: a entrega pertence à última seção, marcada como fechamento. O servidor recusa uma entrega antecipada mesmo se uma configuração inválida já estiver publicada. Após corrigir a ordem e concluir as etapas anteriores, a entrega funciona. A validação também cobre Pinta e preserva experimentos sem entrega.

As regressões foram incorporadas aos testes de domínio e integração do projeto. Cada achado foi observado falhando antes do ajuste e passando depois, com logs neste diretório.

| Verificação | Resultado |
| --- | --- |
| `bun test` em Core | 97 testes passaram |
| `bun test` em Members | 1.008 testes passaram; 21 casos/etapas da suíte de migração foram pulados por ausência do banco descartável explícito |
| Três reproduções originais do review | 3 passaram, 26 asserções |
| `bun run typecheck` em Core e Members | Ambos passaram |
| `bun run check` em Core e Members | Ambos passaram; 53 e 385 arquivos verificados |

Logs finais: [Core](fixed-core-tests.log), [Members](fixed-members-tests.log), [reproduções](regressions-green.log), [tipos Core](fixed-core-types.log), [tipos Members](fixed-members-types.log), [lint Core](fixed-core-check.log), [lint Members](fixed-members-check.log).

Os 27 manifestos e seus roteiros permanecem no mesmo local. O guia de autoria foi atualizado para explicitar a posição da entrega. As correções não exigem uma nova migração. A migração 0082 e a publicação das aulas adaptadas em produção continuam no fluxo de implantação descrito no relatório de implementação. Esta rodada não realizou validação em navegador real.
