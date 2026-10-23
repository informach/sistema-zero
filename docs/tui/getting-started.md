# Primeiros passos

Use Windows x64, Bun 1.3.11, Git e ripgrep (`rg`) no PATH. Browser requer Node 22+ e Chromium compatível com Playwright 1.62.1; a prova local utilizou Node 24.15.0. Docker é opcional para ambientes Linux. Clientes Claude/Codex são opcionais; veja a matriz de versões em [backends](backends.md).

No monorepo, execute `bun install --frozen-lockfile` e `bun run dev:tui`. Para abrir em outro projeto, faça `bun run link:tui`, entre na raiz daquele repositório e execute `sistemazero`. Esse link de desenvolvimento aponta para `packages/tui/dist`; atualizações estáveis usam o [instalador](release.md).

O perfil padrão fica em `%LOCALAPPDATA%\sistemazero\agent`. `SISTEMAZERO_HOME` escolhe outro perfil. Não compartilhe seu SQLite por rede nem use o mesmo perfil entre usuários. O supervisor começa sob demanda e continua após fechar a interface; `sistemazero rpc runtime.shutdown` encerra as tarefas e os recursos próprios. Agendas dependem dele ligado.

1. Execute `sistemazero doctor`; confirme readiness `ready` e as dependências necessárias à tarefa.
2. Conecte um backend. Para assinatura: `sistemazero auth claude login` ou `sistemazero auth codex login`. Para OpenRouter, envie sua chave pelo stdin de `sistemazero auth openrouter`, sem colocá-la no comando, no prompt ou em arquivo de projeto.
3. Na TUI, use `/backend claude`, `/backend codex` ou `/backend openrouter`, depois `/models` e `/model ID`. Para clientes oficiais, `/model default` restaura o padrão do cliente. OpenRouter exige seleção explícita de modelo com tools.
4. Comece em `/mode plan` para investigar. Use `/mode build` quando a tarefa autorizar alterações. Processos e efeitos externos apresentam os argumentos para aprovação.

F1 abre ajuda; F2 tarefas; F3 sessões; F4 conexões. Tab alterna entrada/conteúdo; setas navegam; Enter abre a linha selecionada; Esc volta à conversa. Ctrl+C cancela a tarefa ativa; sem tarefa, fecha a interface. Shift+Enter insere uma linha. `/cancel ID` permite interromper outra tarefa.

`/older` carrega histórico anterior; `/more` continua uma lista. `/new` cria sessão; `/fork` congela o contexto recente numa nova sessão; `/export` produz manifesto e partes NDJSON por ArtifactRef. `/attach CAMINHO` inclui até três anexos UTF-8 de até 32 KB; `/detach` remove-os. `/editor` ou Ctrl+E abre o editor externo, suspendendo e restaurando o terminal. Configure `SISTEMAZERO_EDITOR` como array JSON de executable/argumentos; VISUAL/EDITOR são tratados como um executable literal, sem shell.

Perguntas pendentes aparecem com a tarefa de origem. Leia o conteúdo completo com `/question ID`; responda com `/answer ID resposta`. Aprovações aceitam `approve`, `allow_session` ou `deny`. Um grant de sessão vale apenas para os mesmos argumentos/workspace por até oito horas.

Os painéis `/team`, `/workflows`, `/schedules`, `/environments`, `/services`, `/browser`, `/previews`, `/mcp`, `/usage`, `/memory` e `/checkpoints` mostram dados reais. Ações avançadas usam `/tool NOME JSON` ou `/control METODO JSON`; `/capabilities` lista os contratos. Ainda não há formulários especializados para cada integração.

O CLI `sistemazero run --mode plan "investigue a falha"` transmite eventos JSONL. `sistemazero tool --session ID --mode build NOME JSON` usa o mesmo dispatcher. Se surgir uma aprovação, responda pela TUI ou por `question.answer` em outro CLI. Tokens e OTP entram exclusivamente por `auth` ou `rpc ... --stdin`; o modelo não recebe esses segredos.
