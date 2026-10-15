# Matriz de suporte e aceite

Esta é uma entrega local 0.1 com capacidades funcionais verificadas e critérios de adoção ainda abertos. Quantidade de ferramentas não comprova superioridade sobre Claude Code.

| Área | Implementado e exercitado | Limite da evidência |
|---|---|---|
| Plataforma | Windows x64, Bun 1.3.11, OpenTUI 0.3.0, React 19.2.6 | Linux/macOS não homologados; release rejeita plataforma diferente |
| Coding | Leitura/busca/patch, hashes, checks, WIP, checkpoints, processos, ConPTY | Processo local tem permissões do usuário; não é sandbox de SO |
| Contexto | Regras hierárquicas, skills, memória por escopo, índice invalidável, TS/JS | Sem embeddings obrigatórios ou LSP universal |
| OpenRouter | SSE, tools progressivas, orçamento, ID de geração e reconciliação | Inferência paga real pendente de chave; nenhum fallback pago silencioso |
| Claude/Codex | Login oficial, coding, retomada, cancelamento e MCP gerenciado | Versões fixadas; custo de assinatura não tem teto monetário API |
| MCP | HTTP/stdio, schemas, OAuth PKCE, entrada/saída pelo dispatcher | Servidores OAuth externos precisam de homologação própria |
| Ambientes | Local, worktree WIP, Docker por digest, recursos/TTL/ownership | Bind mount do workspace sem quota física de disco; campos desconhecidos são recusados |
| Browser | Node/Chromium, isolamento de conta, ações, extração, uploads/downloads | Login/2FA humano; sem desktop pessoal ou serviço remoto obrigatório |
| Preview | Reporter, revisão/hash, console/rede, screenshot e viewer loopback | Sem reporter fica unverified; screenshot não prova resultado funcional |
| Equipes | Até seis agentes descendentes, dois slots, handoff e revisão da integração | Reinício preserva trabalho; retomada geral da equipe exige nova tarefa |
| Receitas/agendas | DSL de 100 nós, foreach limitado, espera durável, IANA/DST | Supervisor precisa estar ligado; sem finally genérico ou daemon instalado |
| Sistema Zero | Fachada por sessão/RBAC, messaging idempotente, helpdesk e Studio | Backend precisa ser implantado/configurado; nenhum envio/build remoto foi realizado |
| GitHub/Telegram | Leituras, PR rascunho por SHA, destinos explícitos e reconciliação | Provas HTTP locais; contas externas não homologadas; não faz push/merge |
| Release | Manifesto, lockfile, instalação externa, upgrade interrompido e rollback | Integridade local, sem assinatura/canal de atualização hospedado |
| Desempenho | F1–F7, índices SQL, carga, cancelamento e ciclo de tarefas | RSS combinado excede meta; comparação de adoção não executada |

O núcleo implementa as capacidades pertinentes dos cinco repositórios sobre contratos comuns. SaaS/billing próprio, Daytona/Browserbase remoto, desktop isolado e canvas entre máquinas pertencem às extensões E01–E03 do plano, não a recursos disponíveis nesta distribuição.

Critérios abertos não foram silenciosamente relaxados. A meta original de memória continua 300 MiB; o resultado observado está em [performance.md](performance.md). Antes de afirmar substituição superior ao fluxo atual, executar as 30 tarefas de adoção com repetições, conjunto final separado, revisão independente e custo por resultado aceito. Latência de uma fixture sintética não mede qualidade de raciocínio.
