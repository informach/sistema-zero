# Revisão completa das oficinas ao vivo — segunda rodada

> Histórico anterior às correções. Os cinco achados foram corrigidos posteriormente em 14/10/2026; veja [implementação e verificação das correções](live-round2-corrections-2026-10-14.md). As reproduções abaixo foram arquivadas como `*.historical.txt`, preservando os logs originais.

Data: 14/10/2026. Objeto: implementação local das oficinas e correções da primeira revisão. Esta rodada não modifica código de aplicação.

**Resultado: cinco novos achados confirmados, sendo dois P1 e três P2.** A abertura da sala e a integridade da publicação no Mural impedem recomendar a liberação da funcionalidade neste estado.

## Achados

### R1 · P1 — A professora não consegue abrir uma sala agendada pela interface

Referências: `packages/member-shell/src/components/live/live-classroom.tsx:300` e `packages/members/src/application/live/live.service.ts:712`.

Os controles “Abrir recepção” e “Começar encontro” só aparecem quando `joined` já é verdadeiro. Porém, o comando de entrada chama `operational(context, true)`, que aceita somente os estados `lobby` e `live`, inclusive para a professora. Uma ocorrência nova nasce em `scheduled`.

**Reprodução:** abrir a sala recém-agendada como professora e clicar em “Entrar como professora”. O servidor responde “A professora ainda não abriu a sala”; os controles necessários para abri-la continuam ocultos. Não há outro controle de abertura no cadastro administrativo que resolva essa dependência.

**Impacto:** a primeira entrada da professora e o início normal da oficina ficam bloqueados, mesmo com a infraestrutura de mídia configurada.

**Correção indicada:** permitir a preparação e abertura pela professora antes de exigir entrada, ou oferecer uma entrada administrativa em `scheduled` com as permissões de mídia adequadas. Preservar a restrição de entrada das crianças e testar a sequência completa `scheduled → lobby → live` pela interface.

**Evidência:** reprodução no serviço real e no componente `LiveClassroom` conectado ao serviço real. Neste último, apenas os componentes periféricos de Estúdio, atividades e mídia foram substituídos; a lógica de entrada, os controles e a decisão do servidor são reais.

### R4 · P1 — Uma resposta perdida na publicação pode deixar o Mural sem o arquivo do jogo

Referências: `packages/member-shell/src/routes/studio.ts:434`, `packages/member-shell/src/server/gateway.ts:77` e `packages/hub/src/application/showcase/showcase.service.ts:543`.

Depois de enviar o arquivo jogável ao armazenamento, o BFF solicita a criação do post no Hub. Qualquer resposta diferente de 200 provoca a exclusão do arquivo da oficina. O gateway também representa timeout e desconexão como 503: essa resposta não informa se o Hub já confirmou a transação.

**Reprodução:** o Hub cria o post, mas sua resposta se perde. O BFF recebe 503 e apaga o arquivo A, já referenciado pelo post. Na repetição com a mesma chave de idempotência, Members gera um arquivo B e o Hub devolve o post existente, referenciado por A. O BFF elimina B por considerá-lo duplicado e retorna sucesso. A continua ausente.

**Impacto:** a publicação existe, mas o jogo não abre. Repetir a operação pode informar sucesso sem recuperar a publicação.

**Correção indicada:** manter identidade estável para a tentativa de publicação e reconciliar o resultado com o Hub antes de excluir arquivos. Falhas de transporte ou respostas ambíguas não justificam excluir imediatamente o artefato; a limpeza precisa comprovar que ele não está referenciado.

**Evidência:** rota real de publicação, com armazenamento em memória e Hub simulado na fronteira HTTP para reproduzir “transação confirmada, resposta perdida”. O teste verifica o arquivo ausente após o primeiro 503 e após o segundo 200. A deduplicação que mantém o `playId` original foi conferida no serviço do Hub.

### R2 · P2 — A ajuda aceita pode ficar presa e impedir a retomada da gravação

Referências: `packages/members/src/application/live/live-workspace.service.ts:472`, `:508`, `:518` e `packages/members/src/infrastructure/live/own-recording.provider.ts:163`.

A autorização de escrita tem uma concessão de 30 segundos. Se ela expira durante uma assistência já aceita, `attachTeacher` recusa a reconexão e `returnAuthorship` recusa a devolução porque exige uma escrita ainda autorizada. `cancelAssistance` só aceita convites pendentes. A expiração automática existente também só trata esses convites, mantendo a assistência aceita como `active`.

**Reprodução:** a criança aceita a ajuda, a professora assume o projeto e fica mais de 30 segundos sem renovar a concessão. Depois de restabelecer a presença na sala, a professora não consegue reassumir, devolver ou cancelar a assistência. O gravador continua recusando `resume` com `RECORDING_ASSISTANCE_ACTIVE`.

**Impacto:** se a criança estiver desconectada e não puder revogar ou recuperar a autoria, a professora não tem uma recuperação disponível. A gravação da turma pode permanecer pausada durante o restante da aula.

**Correção indicada:** reconciliar assistências com concessão vencida, invalidando a autorização antiga e preservando a última revisão confirmada e os rascunhos locais. A professora precisa conseguir encerrar uma assistência abandonada sem obter novamente autorização para editar. Retomar a gravação somente depois dessa reconciliação.

**Evidência:** `LiveService`, `LiveWorkspaceService`, repositórios Drizzle e `OwnRecordingProvider` reais em PostgreSQL local. Apenas a resposta do processo externo de gravação é simulada. As três tentativas de recuperação falham e a gravação permanece bloqueada.

### R3 · P2 — Um comando atrasado de abaixar as mãos apaga pedidos mais recentes

Referências: `packages/members/src/application/live/live.service.ts:802` e `:961`.

Levantar a mão altera `handAt`, mas não avança a versão da ocorrência. “Abaixar mãos” valida a versão da ocorrência e depois apaga `handAt` sem comparar a geração ou o horário do pedido. Assim, uma versão anterior ao novo pedido ainda é aceita.

**Reprodução:** a professora recebe a sala na versão V; uma criança levanta a mão; um comando de abaixar mãos baseado na versão V chega depois. A versão continua V, o comando passa e o pedido recém-feito desaparece.

**Impacto:** a criança perde sua vez de falar sem a professora ter visto o novo pedido. A falha afeta tanto o comando coletivo quanto o individual sob a mesma condição e contraria a proteção contra comandos atrasados prevista na proposta.

**Correção indicada:** usar uma revisão ou geração do pedido, ou atualizar a versão que protege esse comando. Abaixar somente os pedidos abrangidos pela visão que originou a ação; testar comandos individuais e coletivos com pedidos intercalados.

**Evidência:** teste do serviço real registra a mão levantada, a versão inalterada e o apagamento pelo comando coletivo antigo.

### R5 · P2 — “Minha agenda” inclui oficinas sem inscrição e oferece links sem acesso

Referências: `packages/members/src/application/live/live.service.ts:453`, `:477` e `packages/member-shell/src/components/live/live-catalog.tsx:122`.

O catálogo inclui turmas abertas de programas publicados para permitir descoberta. A mesma coleção é usada para retornar `sessions`, e a interface renderiza todas elas em “Minha agenda”, com o link “Abrir encontro” ou “Preparar sala”. O acesso à sala, corretamente, exige inscrição ativa ou atribuição como professora.

**Reprodução:** uma criança sem nenhuma inscrição consulta o catálogo com uma oficina publicada e aberta. A sessão aparece na agenda, mas abrir seu link falha porque não existe matrícula. A mistura também pode atingir a agenda de uma professora em relação a turmas públicas que não lhe foram atribuídas.

**Impacto:** a agenda comunica um acesso inexistente e leva a uma página indisponível. Não foi identificado acesso indevido ao conteúdo; o defeito é a inconsistência entre descoberta, agenda e autorização.

**Correção indicada:** separar os resultados de descoberta dos encontros pessoais. A agenda deve refletir a inscrição e a atribuição, com estados explícitos para acessos encerrados; ofertas públicas devem orientar a inscrição pelo responsável.

**Evidência:** teste do serviço real confirma matrícula vazia, sessão pública presente na resposta e recusa de acesso. O uso sem filtro dessa coleção foi verificado no componente do catálogo.

## Escopo e método

O [inventário](live-review-round2-2026-10-14/scope-inventory.json) relaciona 228 arquivos em 11 pacotes, combinando os arquivos da primeira revisão com as mudanças e os arquivos novos atuais. Inclui código, testes, configuração, documentação, snapshots de migração e recursos binários; a contagem não significa leitura de cada linha de cada artefato.

Foram examinadas as jornadas e integrações de catálogo, administração de turmas, inscrição e vínculo familiar, acesso por encontro, entrada e moderação, áudio/vídeo, supervisão, assistência ao projeto, persistência e recuperação, atividades compartilhadas, publicação no Mural, gravação, revisão/publicação de replay e expiração. Foram conferidos os pontos de composição, autorização nas rotas, contratos, migrações SQL e as alterações relevantes em componentes usados também nas aulas gravadas.

A análise priorizou falhas observáveis e transições entre componentes. A suíte de regressão das correções anteriores passou; os cinco achados acima são cenários adicionais que ela não cobre. Os relatórios anteriores permanecem preservados como histórico.

Não foram feitas alterações na aplicação, migrações de produção, deploys ou contratação de serviços. Os testes usam o banco local de testes; esta rodada acrescenta apenas os artefatos de auditoria.

## Verificação desta rodada

| Conjunto selecionado | Resultado |
| --- | --- |
| Members: domínio, HTTP, mídia, projetos, aprendizagem e PostgreSQL | 79 passaram |
| Member shell: BFF, mídia, acesso, prévias e rascunhos | 29 passaram |
| Estúdio: persistência, observação, prévia e isolamento de capa | 62 passaram |
| Kids: componentes das oficinas e navegação | 10 passaram |
| Kids: regressões das atividades e aulas gravadas | 135 passaram |
| Hub: acesso e publicação no Mural | 57 passaram |
| Gravador e efeitos de câmera | 6 passaram |
| Supervisor | 5 passaram |
| Core: concessões por encontro e supervisão | 3 passaram |
| **Total de testes existentes selecionados** | **386 passaram; nenhum falhou** |

Há ainda **seis testes de reprodução**, todos confirmando os defeitos descritos: quatro de domínio/integração, um de interface e um da publicação. Eles afirmam o comportamento incorreto para documentá-lo; seu resultado verde **não representa aprovação funcional** e não deve ser convertido em critério de aceitação da aplicação.

Os logs estão em [live-review-round2-2026-10-14](live-review-round2-2026-10-14/). `git diff --check` terminou sem apontamentos. **As sete verificações de tipos terminaram com código de saída 0:** Members, member-shell, Admin, community-kids, Estúdio, live-recorder e live-supervisor. Cada uma foi executada com `bun run typecheck` no respectivo pacote e está registrada em seu arquivo `*-typecheck.log`.

## Limites da verificação

- Não foi realizada uma aula real com 6–8 dispositivos, redes distintas, permissões de câmera/microfone e reconexões simultâneas. Não há aprovação de capacidade ou qualidade audiovisual em produção.
- O teste do gravador utiliza Chromium e FFmpeg reais com fronteiras de transporte/armazenamento simuladas; não valida o serviço Cloudflare/R2 nem a implantação no Railway.
- Os testes de componentes usam DOM de teste. Não substituem a inspeção visual da sala no navegador, a verificação da identidade visual em diferentes tamanhos de tela ou a validação com crianças.
- As migrações SQL foram inspecionadas e os serviços testados com PostgreSQL local. Não foi feita migração de um banco de produção nem novo build de produção nesta rodada.
- A passagem dos testes selecionados não significa execução integral de todas as suítes do monorepo. As verificações anteriores não foram apresentadas como resultados novos.

## Reproduzir os achados

Executar separadamente para evitar que os mocks de fronteira de uma reprodução afetem outra. R2 depende do PostgreSQL local de testes; confirmar que ele executou, em vez de ser marcado como ignorado.

Na raiz do repositório:

```powershell
bun test ./.audits/live-review-round2-2026-10-14/reproductions.test.ts
bun test ./.audits/live-review-round2-2026-10-14/publication.test.ts
```

Em `packages/community-kids`, para carregar a preparação de DOM configurada pelo pacote:

```powershell
bun test ../../.audits/live-review-round2-2026-10-14/classroom.test.tsx
```
