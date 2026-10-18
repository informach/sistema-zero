# Fronteiras

`runtime/types.ts` contém identidade/eventos/sessão/provider. `runtime/registry.ts` contém apenas registro host-owned, seleção pelo catálogo Core e import lazy; não importa payload de runtime/renderer/editor. A superfície é um iframe criado e montado pelo host, passado ao provider, não campo documental. O supervisor futuro valida a identidade e limita mensagens antes de emitir eventos.

O registry resolve capacidades pelo Core e verifica modo/operação antes de importar. Cacheia apenas módulo/provider, nunca sessões. Cada caller cancela sua espera independentemente; import falho sai do cache para retry. Providers JS/Python e integração UI continuam tarefas seguintes; não habilitar writer v3 antecipadamente.

Plano operacional: `docs/superpowers/plans/2026-10-16-studio-python-l2.md`. Pendências de tipagem/refino/store de L1 são dependência desta integração, não concluídas por existirem interfaces.
