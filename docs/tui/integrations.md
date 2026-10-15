# Integrações da equipe

As conexões são locais ao perfil. Credenciais ficam no cofre do sistema operacional; códigos OTP e tokens entram por comandos locais, nunca por ferramentas do modelo. As capabilities passam pelo mesmo dispatcher, aprovação, orçamento e journal das demais tarefas. Nenhuma conexão de rede é iniciada apenas por abrir o chat.

## Sistema Zero

`staff.configure {origin}` configura a origem HTTPS do gateway (HTTP somente em loopback para desenvolvimento). `staff.otp.request {email}` usa o OTP existente, purpose sign_in e platform main; `staff.otp.verify {email,code}` conclui o login. Primeiro acesso sem senha continua obedecendo ao serviço de identidade. `staff.status` consulta /auth/me e verifica a sessão vigente; `staff.logout` revoga a família antes de remover a credencial local. A rotação é serializada; resposta perdida durante refresh exige novo login, sem reutilizar token de uso único.

As capabilities recebem origin e userId, para que a aprovação não migre silenciosamente entre contas. `sistemazero_read` consulta identidade, templates/recibos, tickets, base de conhecimento e entregas do Studio, com paginação. `sistemazero_message_send` envia template de e-mail/WhatsApp para um destino explícito; exige admin/superadmin. `sistemazero_helpdesk_reply` exige uma confirmação humana nova para o texto e a versão do chamado, mesmo havendo grant. O serviço de helpdesk conserva sua intenção, controle de versão e reconciliação de entrega.

O backend novo é `POST /auth/staff/operations`: JWT e refresh vigente são verificados pelo auth, com conta, papel atual, estado e primeiro acesso. Sessões infantis, de perfil e de impersonação são recusadas. A operação é uma união fechada de contratos; não aceita URL ou shell arbitrário. Mutações gravam intenção auditada antes do dispatch e resultado depois, usando digest do conteúdo/destino; segredos e corpo da mensagem não entram na auditoria.

O auth delega envios por HMAC ao gateway. As novas rotas `/messaging/staff/{send,status}` aceitam somente o consumer auth e o token interno injetado pelo gateway. O consumer persistido da mensagem é staff:ID_DO_USUARIO; consultas de recibo não cruzam contas. As rotas S2S existentes continuam HMAC. Configure AUTH_CONSUMER_ID=auth no auth e no messaging; o gateway reserva essa identidade. A mesma intenção com outro conteúdo/destinatário retorna conflito, inclusive em corrida de inserts. HTTP 202 indica aceitação/enfileiramento, não entrega. Ausência temporária de recibo não prova que um envio em voo falhou.

## Studio

`studio_build_prepare` captura arquivos e materiais binários selecionados, exige hashes atuais, `templateId` e `parentOrigin` e devolve um snapshot imutável com manifesto. A opção `validate` vem habilitada por padrão. O limite de 2 MB considera o envelope UTF-8 completo, inclusive base64. `studio_build` envia exatamente esse snapshot pela fachada autenticada.

O contrato de caminhos, templates, limites, colisões e configs reservadas é compartilhado em core/studio e reutilizado pelo runtime. `package.json` e `package-lock.json` atravessam a fachada para validação das dependências efetivas; só o runtime conhece o lock instalado e verifica versões, integridade e grafo transitivo antes de gerar configuração confiável. Scripts/configuração enviados não são executados pelo compilador.

O resultado inclui referência remota de preview com expiração, identidade da validação e evidências, quando fornecidas pelo runtime. Metadados e logs ficam em artefatos locais; o conteúdo compilado permanece no serviço remoto e não vira um preview local permanente. Falhas de build, tipos ou playtest retornam `success:false` com diagnóstico. Não há publicação automática.

Configure STUDIO_PRO_RUNTIME_URL e STUDIO_PRO_RUNTIME_TOKEN no auth para habilitar o build remoto existente. O token permanece no servidor. O TUI não instala nem publica esse serviço; a homologação remota depende de seu ambiente. Leituras de entregas usam as rotas administrativas existentes do members.

## GitHub e Telegram

`integration.configure` recebe kind github + repositories ou kind telegram + chats. `integration.secret` grava o PAT/bot token no cofre. `integrations.status` mostra a configuração e connectionId, sem segredo; trocar configuração/credencial invalida a vinculação de aprovações antigas. `integration.disconnect` remove a credencial. Configure tokens GitHub com permissões apenas nos repositórios necessários.

`github_read` lê PRs, arquivos, checks e execuções paginadas. `github_draft_pr` exige branch já publicada, SHA revisado, título, corpo e intentId; cria somente rascunho. Não faz push nem merge. Revalida o SHA antes de criar e sinaliza revisão necessária se o branch mudar durante a criação. O corpo contém um marcador do recibo para reconciliação. Contrato consultado: [GitHub REST Pull Requests](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request), versão 2026-03-10.

`telegram_send` envia texto simples de até 4.096 caracteres somente aos chats configurados. Não há repetição automática de sendMessage. Contrato consultado: [Telegram Bot API](https://core.telegram.org/bots/api#sendmessage).

Ambas as mutações mantêm ledger persistente: mesma intenção confirmada devolve o recibo; conteúdo/destino alterado é conflito; crash ou resposta perdida permanece incerto após reinício. `outbound.list` consulta os recibos e `outbound.reconcile` exige evidência local para confirmar ou registrar não aplicação. A reconciliação do efeito do dispatcher é separada e continua necessária quando ele está bloqueado. Não conclua não aplicação pela mera ausência de resposta.

O cliente HTTP limita corpo, deadline e redirects. Leituras fazem no máximo uma nova tentativa após 150 ms para 502/503/504; mutações e refresh nunca repetem automaticamente. Três falhas abrem o circuito por 30 segundos. As fixtures locais provam contratos e recuperação; não equivalem a um envio ou PR real homologado nas contas da equipe.
