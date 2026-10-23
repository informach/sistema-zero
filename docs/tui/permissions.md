# Permissões e execução

Plan permite capabilities de leitura. Build também permite alterações de workspace; execução de processos e efeitos externos pedem aprovação com nome e argumentos completos. Grants fixam digest do contrato, argumentos, workspace e sessão. Trocar conta, contrato ou destino invalida o vínculo anterior. Filhos não ganham ferramentas ou orçamento além da tarefa raiz.

O mesmo dispatcher atende TUI, CLI, MCP, agentes e workflows. A intenção é persistida antes do dispatch. Uma operação externa sem resultado confirmado fica `unknown`; nova chamada idêntica é bloqueada até reconciliação. Texto de página, arquivo, skill, log ou modelo não concede autorização.

Processos locais aprovados executam como o usuário. Job Objects no Windows controlam descendentes, memória e quantidade de processos; isso não constitui sandbox de arquivos/rede. Escolha explicitamente container quando precisar da contenção disponível. Docker indisponível não provoca fallback para o host. Confira [ambientes](environments.md) e [browser](browser.md).

Leituras pelo dispatcher têm oito slots e fila limitada. `process_run`, `project_check_run` e `environment_run` compartilham um slot pesado por workspace. O supervisor admite dois executores agentes; equipes e workflows reutilizam esses slots. Coordenadores não criam uma fila de agentes invisível à sessão.

No Windows, perfil e named pipe recebem DACL protegida do usuário, seguida de verificação. O handshake IPC autentica os dois lados. Identidade física/case normalizada impede criar outro supervisor pelo mesmo caminho com grafia diferente. O ownership usa mutex do kernel com ACL do usuário e liberação por encerramento; perder o lock encerra o processo para não continuar executando sem exclusividade. [Semântica de mutex](https://learn.microsoft.com/en-us/dotnet/api/system.threading.mutex?view=netframework-4.8.1).

Credenciais ficam no cofre do SO. Aprovação de envio não equivale a mensagem entregue: recibos distinguem aceitação, conclusão e incerteza. Helpdesk exige confirmação humana do conteúdo/versão. GitHub cria rascunhos com SHA revisado; não faz push ou merge. Veja [integrações](integrations.md).
