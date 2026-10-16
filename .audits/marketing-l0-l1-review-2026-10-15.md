# Revisão dos lotes L0 e L1

## L0 — cliente oficial e isolamento

- Corrigida corrida de login: inscrição antes do RPC, associação ao loginId e limpeza no cancelamento/encerramento. Teste cobre conclusão antecipada e tentativa diferente.
- MCPs herdados são explicitamente desabilitados por configuração de cada servidor; tabela vazia não remove configurações herdadas. Catálogo efetivo verificado: 11 cadastrados, zero habilitados.
- Comandos, hooks, plugins, agentes e navegador desabilitados. Code Mode permanece ativo: a ferramenta nativa de imagem depende deste executor no Codex 0.162.1. Desabilitá-lo removeu a imagem e foi uma regressão identificada pelo teste real, não mascarada por prompt.
- Saída de imagem limitada antes da alocação; arquivos aceitos somente na pasta oficial de imagens, com realpath e limite de tamanho. Erros distinguem geração falha, resultado ausente e arquivo recusado.
- Nova prova real após correção: criação 1.209.676 bytes, SHA-256 `8afd8b620a4dc824bb53340e8182c8700162c7a342293443b24c8d28b2f08f74`; edição 1.399.074 bytes, SHA-256 `53d476446faac706752159ffb501ce96d9688bcb2f56560696c31196b86de0ca`.
- Texto real aprovado com ChatGPT Pro e Claude Max. Desktop: 13 testes passaram e typecheck passou.
- Ainda requer validação assistida de primeiro login numa instalação sem credenciais. As assinaturas existentes não foram desconectadas para simular esse caso.

## L1 — contratos e autoridade do servidor

- Contratos compartilhados validam documentos editoriais, revisões, operações, assets, execução, importação, observações e timeline. APIs distinguem ausência de métrica de zero observado.
- Sete tabelas novas no schema marketing; migration 0005 gerada por Drizzle, sem mudança de enums ou tabelas legadas. Aplicada em PostgreSQL 16 local exclusivo para a revisão.
- Projeto é unidade de autorização e ordenação. Lock da linha do projeto serializa mutações e o cursor; snapshot lê o mesmo estado confirmado. Permissões verificadas antes de devolver recibos de retries.
- Revisões são imutáveis. CAS por componente impede sobrescrever revisão de outra pessoa; componentes distintos progridem independentemente. Recibo e revisão fazem parte do mesmo commit. Reutilizar operationId com payload diferente é rejeitado.
- Referências não atravessam projetos; arquivos pendentes não são aceitos em documentos. Histórico e arquivamento preservam conteúdo.
- PostgreSQL real: 7 testes passaram cobrindo concorrência, repetição, autorização/revogação, cursor, dependências e compatibilidade dos enums existentes. Suíte completa do marketing: 245 testes, zero falhas; typecheck e Biome passaram. Contratos: 4 testes e typecheck passaram.
- Achado no teste: Bun 1.3.11/Windows bloqueia I/O PostgreSQL ao avaliar expect(promise).rejects.toMatchObject; reprodução mínima trava até fora do runner, enquanto o await normal conclui em menos de um segundo. As asserções assíncronas de integração usam node:assert/strict, API padrão que não bloqueia esse I/O. Nenhuma alteração no driver ou timeout de produção.

## Limite desta revisão

L1 entrega persistência editorial e contratos; não declara filas de execução, transferência de mídia ou bancada concluídas. Esses fluxos precisam dos lotes seguintes e dos testes integrados. A execução segue sem pausa por lote conforme autorização do usuário. Commit e merge local somente após revisão integrada; nenhuma publicação remota autorizada por essa etapa.
