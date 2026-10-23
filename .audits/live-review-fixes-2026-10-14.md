# Correções da revisão de oficinas ao vivo

Base: `staging` local após `9b8e019b6` (merge de `integra/cursos-ao-vivo`). Os oito achados da revisão de `feat/cursos-ao-vivo` foram tratados nesta base. Alterações de outras sessões, incluindo Pensa, Studio e marketing, não fazem parte deste trabalho.

| Achado | Correção | Regressão |
| --- | --- | --- |
| 1. Autorização do Vimeo | Cada chamada passa pelo Members antes da deduplicação ou consulta ao Vimeo. O vídeo precisa ser exatamente o vinculado à ocorrência autorizada. | Solicitante sem atribuição durante envio concorrente, vídeo de outra ocorrência, rota HTTP de leitura autorizada. |
| 2. Objetivos do Estúdio | O editor ao vivo renderiza `SectionProjectCheck` com o projeto atual e atualiza o progresso. Autoria local, revisão no servidor e publicação recusam entrega/nota do Estúdio e “Envio em dia” incompatíveis com o ao vivo. | Componente real verifica o projeto e atualiza a aula; PostgreSQL real recusa a publicação incompatível. |
| 3. Matrícula adulta | O seletor busca contas adultas; o domínio exige `learnerId = accountId` e verifica a conta ativa no Auth. A biblioteca inclui os projetos próprios desse aluno. A validação de perfis infantis foi preservada. | Busca e inscrição pela interface; matrícula → catálogo → sala → projeto → biblioteca; rejeição de reserva/perfil infantil em turma adulta. |
| 4. Histórico das gravações | Seleção explícita de gravações publicadas de `room.recordings`, com ocorrência, capítulos e versão próprios. Uma reposição não esconde a gravação original. | Interface abre a ocorrência original durante reposição agendada e permite voltar ao encontro atual. |
| 5. Slug do curso | Os leitores da turma e da sala resolvem o slug pela tabela de cursos, usando o ID estável. O resumo comercial histórico permanece. A sala continua com uma consulta SQL. | Renomear curso e abrir turma/sala; teste de desempenho com 1 e 24 encontros e nove participantes. |
| 6. Retomada no Vimeo | MP4 e Vimeo usam a mesma API de posição, por aula e versão. Vimeo restaura antes de montar o player e salva durante reprodução, pausa, ocultação e saída. | Posição anterior do MP4, pausa, desmontagem, reabertura e falha de leitura sem sobrescrever com zero. |
| 7. Recuperação do upload | Recibo privado e durável no R2, criação condicional e reutilização do ID. Resposta perdida do Members é reconciliada; não se apaga um vídeo que pode já estar vinculado. | Save confirmado com resposta perdida, save não confirmado, indisponibilidade persistente e retomada em outra instância; recusa explícita versus criação ambígua. |
| 8. Controles estreitos | Grade de quatro colunas em telas estreitas e quebra de linha nas maiores. A reserva de altura existente acompanha a barra. | Chromium em 320/360/390/640 px e ampliação CSS de 200%; sete controles dentro da tela, alvos de pelo menos 48 px. |

## Operação do envio

Não há nova migration, variável de ambiente ou fornecedor para estas correções. O Admin precisa ler e escrever objetos no bucket de gravação já configurado. Os recibos ficam em `live/vimeo-uploads/<occurrenceId>/<hash>.json`, privados, sem URL no navegador. A criação usa `If-None-Match: *`, cuja atomicidade é documentada pela [Cloudflare R2](https://developers.cloudflare.com/r2/api/s3/api/).

Falha **depois** de registrar o ID: reenviar reaproveita o vídeo. Falha de rede **durante a criação no Vimeo**, antes de receber/registrar o ID: o sistema conserva a reserva e pede conferência administrativa, evitando duplicação. A equipe deve conferir o vídeo por curso/aula/turma/data, recuperar seu ID e concluir o vínculo; só deve remover uma reserva sem ID após confirmar que nenhum vídeo foi criado. Se o recibo falhar após a resposta do Vimeo, o log identifica ocorrência e vídeo para recuperação. Recusas HTTP explícitas de criação liberam nova tentativa. Não se promete uma transação atômica entre R2, Vimeo e PostgreSQL.

Aulas ao vivo já publicadas com critérios antigos de entrega precisam ser revisadas na autoria: trocar o Estúdio para “Experimento independente, sem entrega”, retirar “Envio em dia” e manter os objetivos desejados. Nenhum critério de aula existente foi removido silenciosamente nem foram alterados dados implantados.

## Validação

Os testes executaram somente em processos locais e bancos descartáveis explícitos (`sz_codex_live_review_20261014` e `sz_aulas_qa_codex_live_20261014`). Os testes dos provedores usam fakes. Evidências completas ficam em `.tmp/live-fix-*.log`; a amostra visual, em `.tmp/codex-live-fixes/visual/`.

**507 testes passaram nas execuções finais, sem falhas.** A contagem do Kids inclui os testes que executam fixtures de componentes em processos isolados.

| Suíte | Passando |
| --- | ---: |
| Members: oficinas, unitários e integração HTTP | 134 |
| Admin: oficinas, modalidade, Vimeo e helpers de R2 | 113 |
| Member-shell: mídia e componentes das oficinas | 113 |
| Community Kids: oficinas e seções | 67 |
| Members: regressão de seções, Estúdio, materiais e avaliação legada | 63 |
| PostgreSQL com migrations: modalidade e publicação | 9 |
| PostgreSQL: cursos, projetos, troca de slug e desempenho | 6 |
| Core: critérios de conclusão ao vivo | 2 |

Checagens `tsc --noEmit` concluídas sem erros em Members, Admin, member-shell e Community Kids. Biome passou nos arquivos de código alterados e `git diff --check` passou. Não foi executado build de produção.

Uma asserção de rejeição direta do Bun deixou a conexão PostgreSQL aguardando logo após `BEGIN`; a regressão passou ao aguardar o resultado da Promise antes da asserção, como já fazem outros testes de publicação. Dois testes existentes de temporização falharam com execuções concorrentes e passaram na repetição das suítes, sem alterar suas regras ou o código de produção correspondente. Os tipos gerados do Next no Admin foram regenerados após apontarem para uma rota removida pelo merge.

Não houve push, deploy, chamada real entre navegadores, gravação pelo serviço implantado nem upload real ao Vimeo/R2. A amostra visual usa componentes e CSS atuais, com mídia e atividade substituídas para isolar o layout. O teste integrado com professora e alunos no ambiente implantado continua necessário.
