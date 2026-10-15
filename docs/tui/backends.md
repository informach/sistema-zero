# Backends de IA

| Backend | Autenticação | Execução | Limite de custo |
|---|---|---|---|
| OpenRouter | Chave no cofre do SO | Loop próprio, tools progressivas, streaming e journal | Reserva por passo e orçamento compartilhado; custo desconhecido mantém a reserva |
| Claude Code | Login oficial da assinatura | Agent SDK 0.3.299 / CLI 2.1.299; ferramentas Sistema Zero por MCP | Limites do cliente/assinatura; não é teto monetário API |
| Codex | Login oficial da assinatura | App-server 0.162.1; ferramentas Sistema Zero por MCP | Limites do cliente/assinatura; não é teto monetário API |

Os adapters oficiais verificam versão e autenticação efetiva, preservam IDs nativos de sessão/turno e não herdam chaves de API do ambiente. A troca de backend não converte a sessão privada de outro motor. Os catálogos são consultados ao backend escolhido, sem lista fixa de modelos inventada.

No modo gerenciado padrão, comandos/escritas nativos ficam desabilitados: o cliente oficial usa o dispatcher Sistema Zero por MCP. Isso conserva aprovações, journal e cancelamento. O modo nativo integral não é a base homologada: o sandbox Codex apresentou falha de ACL nesta máquina e não foi flexibilizado para esconder a falha.

OpenRouter envia até 24 schemas autorizados por passo. `capability_search` descobre conjuntos adicionais de até oito ferramentas; a descoberta nunca amplia permissões. Conteúdo e regras de projeto são limitados, versionados e compactados com referências ao original. Clientes nativos administram seu próprio contexto; a seleção progressiva do loop próprio não é anunciada como interceptação do contexto privado deles.

Se o provedor emitir um ID de geração antes de perder a conexão, ele fica no journal. `usage.reconcile` consulta aquela geração. Sem comprovação de custo, a reserva permanece incerta; não se inventa custo zero. Não há fallback automático entre modelos ou repetição de chamadas pagas ambíguas. O usuário escolhe uma nova tentativa explicitamente.

Coding, retomada e interrupção foram exercitados nos dois clientes oficiais. A conta OpenRouter não estava configurada durante a homologação: parser SSE, contratos, orçamento e reconciliação têm provas locais; inferência paga real e comparação de qualidade/custo continuam pendentes. Versões posteriores dos clientes precisam de nova certificação do protocolo antes de escrita.
