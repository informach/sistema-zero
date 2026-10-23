# Correções da segunda revisão das oficinas ao vivo

Data: 14/10/2026. Referência: [revisão anterior](architectural-analysis-2026-10-14-live-round2.md).

Os cinco achados foram corrigidos no workspace. Não foram feitas novas migrações, instalação de dependências, ativação da mídia ou implantação em produção. As alterações de marketing e de outras propostas existentes no workspace foram preservadas.

## R1 — Abertura da sala

A professora agora encontra **Abrir recepção** antes de entrar. Depois da abertura aparece **Entrar como professora**; dentro da recepção, **Começar encontro**. O servidor continua impondo os horários e a autorização da professora, e a criança não pode entrar em uma ocorrência ainda agendada. A correção preserva os componentes e estilos existentes.

Arquivos: `member-shell/src/components/live/live-classroom.tsx` e `member-shell/src/lib/live/classroom-state.ts`.

O teste `community-kids/tests/fixtures/live-classroom-opening.tsx` percorre a sequência completa com o componente e o serviço reais. A captura de mídia é substituída na fronteira do teste. O teste falhou antes da correção por não encontrar a abertura e passou depois. Seu runner executa esse cenário em um processo separado para não compartilhar o cache de módulos do Bun com os testes que substituem o Estúdio.

## R4 — Publicação e repetição após falha de rede

O identificador do arquivo jogável agora deriva de conta, perfil, workspace, revisão e chave da tentativa de publicação. A mesma tentativa conserva o identificador em repetições, reinícios e troca da chave de assinatura; uma nova publicação recebe outro arquivo, evitando que a exclusão de um post afete outro.

O BFF preserva o arquivo privado quando o Hub responde com erro, pois essa resposta pode chegar depois de uma transação já confirmada. Quando uma repetição encontra um post criado pelo fluxo antigo, com identificador aleatório, o BFF restaura o arquivo apontado pelo post antes de retornar sucesso e remover a cópia excedente.

Arquivos: serviço e rota `live-publication` em Members; cliente Members e rota `studio` em member-shell. Foi reutilizado o gerador determinístico já existente, sem biblioteca nova.

Testes: `members/tests/unit/live-publication.test.ts`, `members/tests/integration/live-publication.test.ts` e `member-shell/tests/live-publication-retry.test.ts`. Cobrem resposta perdida após confirmação do post, repetição bem-sucedida, rejeição posterior, recuperação do identificador antigo, estabilidade e separação dos identificadores, validação HTTP e preservação da prova de autorização. As reproduções falharam antes da correção e passaram depois.

O endpoint interno de preparação exige agora `clientIdempotencyKey`; Members e os BFFs devem receber esta alteração juntos. Arquivos de tentativas com resultado incerto são preservados no armazenamento privado. Sua eventual coleta precisa confirmar ausência de referência no Hub; não há exclusão especulativa no caminho de erro.

## R2 — Encerramento de assistência interrompida

A professora encontra **Encerrar ajuda interrompida** quando a concessão de edição expira ou quando a devolução já foi salva e aguarda confirmação da criança. A operação verifica a professora e o identificador da assistência, preserva projeto e revisão, invalida a autorização de escrita anterior e devolve a autoria à criança sem atribuí-la a um dispositivo desconectado.

Uma assistência com edição ainda válida continua exigindo a devolução normal com salvamento. A gravação permanece bloqueada até o encerramento confirmado; depois pode ser retomada. O mesmo fluxo de aplicação das revisões preserva, no IndexedDB da professora, eventuais edições locais ainda não confirmadas.

Arquivos: `members/src/application/live/live-workspace.service.ts` e `member-shell/src/components/live/live-workspace.tsx`.

Testes: `members/tests/db/live-assistance-recovery.test.ts` usa serviços, repositórios e PostgreSQL reais, simulando somente a resposta do processo externo de gravação. Verifica assistência expirada e devolução sem confirmação, rejeição de cancelamento prematuro, ator indevido e pedido antigo, preservação da revisão, recusa de escritas atrasadas e retomada da gravação. `community-kids/tests/live-workspace-review.test.tsx` verifica a ação na interface e a retenção do rascunho local.

## R3 — Pedidos de fala e comandos atrasados

Uma mudança real no pedido de mão ou ajuda incrementa a versão da ocorrência. Comandos de moderação baseados numa visão anterior são recusados; repetições idempotentes do mesmo pedido não alteram a versão. Abaixar e levantar novamente dentro do mesmo milissegundo também produz uma versão nova.

Arquivo: `members/src/application/live/live.service.ts`.

O teste `members/tests/unit/live-review-round2.test.ts` cobre o comando individual e o coletivo, preserva o pedido novo diante do comando atrasado e confirma que um comando atualizado ainda consegue abaixar a mão. Ambos os casos falharam antes da correção e passaram depois.

## R5 — Agenda pessoal e descoberta

Programas e turmas públicas continuam disponíveis para descoberta. A coleção de encontros da agenda passa a incluir apenas matrículas ativas da criança ou família, ou turmas atribuídas à professora. Encontros com prazo expirado permanecem no histórico da matrícula ativa; matrículas revogadas não oferecem um acesso inexistente. A visão administrativa continua incluindo todas as turmas.

Arquivo: `members/src/application/live/live.service.ts`.

O teste `members/tests/unit/live-review-round2.test.ts` verifica visitante, professora sem atribuição, professora atribuída, criança matriculada, responsável, expiração, revogação e administração. A reprodução original falhou antes e passou depois.

## Verificação final

| Conjunto | Resultado |
| --- | --- |
| Members: domínio, rotas e PostgreSQL | 85 passaram |
| Members: contrato HTTP de publicação | 1 passou |
| Member shell: fluxos ao vivo e publicação, executados juntos | 31 passaram |
| Kids: navegação e componentes das oficinas | 12 passaram |
| Hub: acesso e publicação no Mural | 57 passaram |
| **Total de testes distintos selecionados** | **186 passaram, nenhum falhou ou foi ignorado** |

As verificações de tipos de Members, member-shell, community-kids e Admin terminaram com código 0. Members foi verificado novamente após a inclusão do último teste HTTP. `git diff --check` não apontou problemas. Logs: [live-round2-corrections-2026-10-14](live-round2-corrections-2026-10-14/).

As reproduções que exigiam comportamento defeituoso foram arquivadas como `*.historical.txt` na pasta da revisão anterior; seus logs e o relatório foram preservados. Os critérios de aceitação atuais estão nas suítes dos respectivos pacotes.

Não houve teste audiovisual com 6–8 dispositivos reais, validação externa no Cloudflare/Railway ou novo build de produção nesta rodada. Os testes de interface usam DOM de teste; a integração de gravação utiliza PostgreSQL real e um receptor HTTP simulado. A ativação operacional de mídia permanece sujeita à validação já prevista no projeto.
