# Sistema Zero TUI

Agente local para coding, pesquisa, browser, equipes e operações autorizadas do Sistema Zero. A interface OpenTUI, o CLI e o servidor MCP compartilham o mesmo supervisor, journal SQLite, dispatcher e política de aprovação.

```powershell
bun install --frozen-lockfile
bun run dev:tui
```

Para preparar uma distribuição independente: `bun run build:tui`. Para verificar a instalação fora do repositório: `bun run verify:tui`. `bun run link:tui` instala as dependências fixadas da distribuição e registra o comando de desenvolvimento `sistemazero` no Bun.

Leia [primeiros passos](../../docs/tui/getting-started.md), [backends](../../docs/tui/backends.md), [permissões](../../docs/tui/permissions.md), [recuperação](../../docs/tui/recovery.md), [release](../../docs/tui/release.md) e [limitações verificadas](../../docs/tui/support.md). O estado dos lotes e as evidências estão no [review de implementação](../../docs/tui/implementation-review.md).

Windows x64 é a plataforma exercitada. OpenRouter usa API própria; Claude e Codex usam os clientes e logins oficiais. Uma assinatura não fornece créditos OpenRouter. Não há serviço hospedado obrigatório nem daemon do sistema instalado automaticamente.

Validação: `bun run test:tui`; typecheck nos quatro pacotes `agent-core`, `agent-runtime`, `agent-integrations` e `tui`; scripts de release também possuem tsconfig próprio. Os benchmarks reproduzíveis ficam em `packages/agent-runtime/bench` e `packages/tui/bench`.
