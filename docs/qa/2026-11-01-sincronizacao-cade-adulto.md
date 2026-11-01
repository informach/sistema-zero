# Cadê Todo Mundo no adulto

Em 01/11/2026, o conteúdo Kids publicado foi sincronizado com o curso adulto existente em cada ambiente. Houve uma segunda sincronização em produção após a atualização do PDF no Kids durante a conferência.

| Conferência | Staging | Produção |
| --- | --- | --- |
| Curso adulto | publicado | publicado |
| Módulos | 1 | 1 |
| Aulas publicadas | 3 | 3 |
| Blocos de conteúdo | 30 | 30 |
| Vídeos disponíveis no Vimeo | 10 | 10 |
| Anexos | 2 | 2 |
| Falas do Zappy acessíveis | 30 | 30 |
| Blocos concedidos pelo curso | 23 | 23 |
| Fontes atuais do tutor reaproveitadas | 23 | 23 |

Os IDs dos cursos e aulas adultas existentes foram preservados. As aulas ausentes em produção foram criadas e publicadas pela autoria canônica. A animação do módulo, capa, textos, materiais, manifestos, planos dos vídeos e configurações vieram da origem do mesmo ambiente. A oferta de produção foi traduzida para `/pro/`. Nenhuma das dez URLs de vídeo de staging aparece entre as dez de produção. Os MP3s já existiam no cache oficial; não houve nova cobrança de síntese.

Cada transação conferiu que não alterou o Kids e releu o adulto antes do commit. Leituras independentes posteriores retornaram `equivalent: true`. Uma nova preparação de staging retornou `changed: false`. O teste de banco também executou uma aplicação repetida sem escrita.

## Evidência técnica

- 22 testes passaram, 59 asserções, incluindo Postgres local descartável com as 145 migrações reais do Members. Cobertura de rollback, dados de progresso preservados, referências, ambiente, plano concorrente, mídia vencida, idempotência e reserva dos recibos antes do SSH.
- Typecheck completo do Members e do Admin: exit 0. O cache local de tipos Next anterior à retirada do Rive foi regenerado, retirando um validator de desenvolvimento obsoleto. Nenhuma rota antiga foi restaurada.
- Biome nos 11 arquivos de código envolvidos: exit 0. Revisão do diff e `git diff --check` sem problemas.
- Backups e recibos completos permanecem privados em `.cache/course-audience-sync/`. Aplicação staging: `staging-r4/receipt.json`. Nova preparação sem alterações: `staging-r5/`. Última aplicação de produção, com o PDF novo: `production-r3/receipt.json`.

O fluxo operacional está em `docs/operations/sincronizar-curso-kids-adulto.md`. Esta entrega atualiza dados de autoria por SSH; não depende de criar uma nova rota de importação nem de reimplantar a aplicação para que o curso fique publicado. A promoção de mídia de staging para produção e os comandos na interface do Admin são a próxima entrega, registrada em plano próprio.
