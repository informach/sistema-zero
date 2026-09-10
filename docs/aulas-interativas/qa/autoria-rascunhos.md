# Verificação da autoria por seções e rascunhos

Registro de 2026-09-09 UTC (noite de 8 de setembro em São Paulo). Worktree `sistema-zero-aulas`, branch `feat/aulas-interativas`, base `5eedfad6`. Esta evidência corresponde à evolução posterior à entrega inicial e à sua revisão.

## Resultado implementado

O aluno percorre seções com título e conteúdo. Intenção didática e objetivo ficam apenas na autoria, inclusive no contrato enviado ao player. A lista de pendências leva à atividade correspondente e usa o mesmo avaliador da conclusão no servidor. Um bloco de Estúdio/Pinta pode ser referenciado em várias seções, mantendo uma instância, um projeto e uma entrega.

O admin reúne metadados, anexos, blocos e organização em um rascunho compartilhado, com salvamento automático, recuperação local por autor/aula e controle de concorrência. Publicar valida e aplica o conjunto atomicamente. Blocos retirados são arquivados para preservar histórico. As rotas antigas de edição direta foram removidas. O Zappy é atualizado depois da publicação.

Os 27 manifestos agora têm cartões de vídeo planejado na seção correta. A importação escreve no rascunho; reimportar preserva IDs e vídeos vinculados. O upload continua sendo Vimeo/TUS, com conferência de processamento no servidor antes da publicação. Não foram criadas flags.

O [guia de autoria](../guia-de-autoria.md) descreve o cadastro, o projeto compartilhado, a recuperação e a publicação. Os [27 roteiros e manifestos](../README.md) estão organizados por curso e aula.

## Evidências locais

| Verificação | Comando ou procedimento | Resultado |
| --- | --- | --- |
| Suíte global | `bun run --filter '*' --sequential test`, com bancos PostgreSQL locais descartáveis nas variáveis de testes | Exit 0; 14.373 passaram em 27 pacotes; nenhuma falha. Os 37 skips pertencem às integrações condicionais do Helpdesk. |
| Members com banco real | Incluído na suíte global com `TEST_DATABASE_URL` e `LEARNING_QA_DATABASE_URL` | 992 testes passaram, nenhum skip. |
| Upgrade e rascunhos em PostgreSQL 16 | Suíte de migrations partindo do schema anterior às aulas interativas | 17 testes passaram, incluindo nove cenários novos de rascunhos. |
| Tipos dos pacotes alterados | `bun run typecheck` em admin, api-gateway, community, community-kids, core, member-shell e members | Exit 0 nos sete pacotes. |
| Formatação e lint | `bun run ci` | Exit 0; 4.931 arquivos verificados. Um aviso preexistente de tamanho em `packages/studio/playground/moldaDemoAssets.json`. |
| Builds de produção | `bun run build` em admin, community-kids e community | Exit 0 nos três, incluindo TypeScript e geração de páginas. |
| Schema e migrations | `bun run db:generate` em members | Exit 0; nenhuma mudança de schema a gerar. Migration `0081_special_inertia.sql` gerada e testada no upgrade real. |
| Roteiros originais | SHA-256 dos arquivos de Documents comparado a `catalogo.json` | Os 27 arquivos continuam idênticos; 27 roteiros adaptados disponíveis e 118 trechos de produção catalogados. |
| Integridade do lote | `git diff --check` e conferência dos caminhos alterados | Sem erros no diff; alterações de outras tarefas permanecem no checkout original. |

O commit remoto `5eedfad6`, que ajusta duas asserções assíncronas nos testes do Molda, foi incorporado por fast-forward antes da entrega. A suíte global acima passou antes dessa incorporação. A repetição do Molda simultânea aos dois builds encontrou um timeout de 5 segundos no teste aleatório do atlas; os builds passaram. A suíte do Molda foi repetida sem os builds concorrentes: 498 testes passaram, nenhuma falha, em 36,56 segundos, sem alterar o teste ou ampliar o timeout.

## Cobertura dos comportamentos críticos

- Concorrência entre autores, repetição idempotente, resposta perdida, recuperação local e rejeição de revisão desatualizada.
- Rascunho incompleto sem alterar conteúdo publicado; publicação atômica; rejeição de IDs de outra aula; regras de certificado, vitrine e cadeia do Pinta.
- Organização sem invalidar progresso; preservação de submissões ao arquivar blocos; ausência desses blocos na versão corrente.
- Importação dos 27 manifestos, repetição da mesma operação e nova reimportação, preservando os 118 cartões e suas associações.
- Publicação com vídeo pronto, processamento pendente, falha de consulta ao Vimeo e retry após resposta perdida; salvamento/importação sem indexação no Zappy.
- Continuidade do estado e identidade DOM do editor entre seções; requisito contado uma vez; acesso direto à atividade pendente; prévia de descoberta incompleta.
- Rotas antigas de escrita indisponíveis e metadados didáticos ausentes do contrato público do aluno.

## Limites e aceite em staging

O navegador integrado não ofereceu uma sessão: `agent.browsers.list()` retornou `[]`. Não foi feita revisão visual autenticada do admin/player nesta execução. Os testes DOM, HTTP e de banco não substituem esse aceite. O CI executa os fluxos E2E existentes antes do deploy; eles também não representam o percurso autenticado de todos os novos conteúdos.

Nenhum arquivo foi enviado ao Vimeo e nenhum manifesto foi aplicado ao banco de staging ou produção nesta execução. A gravação dos 118 trechos continua sendo trabalho de conteúdo. A publicação impede que cartões obrigatórios de vídeo ainda incompletos sejam enviados aos alunos.

Para o aceite, abrir uma aula de teste em staging, importar seu manifesto, editar uma seção e conferir o salvamento ao reabrir. Vincular um vídeo real, verificar processamento e reprodução. Percorrer a prévia e a aula com aluno de teste, continuar o mesmo projeto em duas seções e conferir as pendências antes de concluir. Testar também duas abas de autoria para observar o conflito sem sobrescrita.

O destino autorizado é a branch `staging`; a promoção para produção permanece com o usuário. O resultado remoto deve ser conferido no workflow CI do commit entregue, que inclui a espera pelos healthchecks dos serviços de staging.
