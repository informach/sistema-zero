# Unificação da entrada de IA no Studio

A aba inferior IA foi removida, junto do item `ai` no menu e do import lazy do AIPanel no caminho do produto. O playground mantém o tutor existente e deixou de ligar `features.ai`. Console, terminal e o botão Zappy permanecem. Não foi criada outra instância do assistente.

`LegacyAIEntryPoints`, montado uma vez no Shell, redireciona `setBottomTab('ai')` e a transição de visibilidade antiga para o tutor da própria instância. `renderBottomPanel('ai')` conserva um redirecionamento explícito para consumidores internos. Sem tutor configurado pelo host, esses caminhos não chamam inferência e não criam fallback. Nenhum atalho/comando adicional de IA foi encontrado nos hooks, controls ou Monaco atuais.

Settings agora contém aparência e controles de aprendizado autorizados. Não mostra chave/modelo OpenRouter. `initialSection='ai'` fecha a janela e abre o Zappy existente quando autorizado; caso contrário, informa indisponibilidade e mantém aparência acessível. Valores antigos de credenciais não são lidos pela nova interface nem removidos silenciosamente.

A superfície externa `AIProvider` e tipos relacionados continua exportada; `features.ai` e o resolvedor ainda aceitam provider/model/allowUserKey. Foram marcados como depreciados sem quebra de import/contrato. Os providers e o AIPanel histórico permanecem em disco para compatibilidade; não são montados pelo produto. Orientação ao host: `packages/studio/docs/ai-provider-migration.md`; CSP/documentação de embedding ajustadas para o adaptador/BFF do Zappy.

Arquivos principais: `studio/legacy-ai.tsx` e teste, `layout/bottomTabs.tsx`, `lazyPanels.ts`, `Shell.tsx`, `Topbar.tsx`, `topbar/menuLayout.ts`, `settings/SettingsDrawer.tsx` e teste, `ai/contracts.ts`, `studio/config.ts`, `state/uiStore.ts`, `playground/App.tsx`. Testes de BottomPanel/NarrowPanels atualizados para a composição real. Comentários de layout ajustados.

Verificação: 50 testes passaram em sete arquivos (redirecionamento em todos os modos, indisponibilidade sem tutor, duas instâncias, Settings, layouts, menu, config e provider legado). Mais 41 testes passaram em oito arquivos de regressão (incluindo os previews e StudioEditor/StudioLesson), log em `studio-adendo-ui-regression-2026-10-15.txt`. Biome passou nos 17 arquivos desta frente. Os testes de layout existentes ainda emitem avisos de `act` em imports lazy, sem falhas. O typecheck global final pertence à sessão principal após estabilização dos arquivos compartilhados.

Não alterados: ZappyPanel, ProBuilderPanel, contratos core do builder, runtime, publicação, player ou servidores.
