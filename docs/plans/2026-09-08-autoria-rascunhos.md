# Autoria por seções, rascunho e publicação

Plano aprovado: simplificar a experiência da aula e unificar a autoria.

## Decisões

- Aluno vê título e conteúdo; intenção didática e objetivo ficam na autoria.
- Índice livre e lista de requisitos visíveis durante a aula, usando as mesmas regras da conclusão.
- Um bloco de Estúdio/Pinta pertence à aula e pode ser referenciado por várias seções. Projeto e requisito não se duplicam.
- Editor organizado por seções, com formulários existentes e salvamento automático em rascunho após um segundo; mudanças estruturais entram imediatamente na fila.
- Um rascunho compartilhado por aula, isolado do conteúdo publicado. Escritas com revisão esperada e operação idempotente; recuperação local por autor/aula sem sobrescrever conflitos.
- Publicação explícita, validada e atômica. Preservar IDs e histórico; arquivar blocos retirados. Alterações de organização não reiniciam progresso.
- Metadados, anexos, blocos, seções e apoio fazem parte do mesmo rascunho. Nenhum caminho antigo pode escrever diretamente na versão publicada.
- Prévia usa rascunho sem progresso real. Zappy recebe somente o conteúdo publicado.
- Vídeo antigo fica em apoio recolhido fora da sequência. Exigências antigas não mapeadas vão para fechamento; nenhuma é silenciosamente removida.
- Manifestos importam no rascunho; reimportação preserva IDs e vídeos vinculados. Converter os manifestos antigos e atualizar os 27 manifestos e o guia.
- Cartões de vídeo planejado substituem pendências textuais. Upload Vimeo no lugar do vídeo; confirmar processamento no servidor antes de publicar e reconciliar ao reabrir.
- Navegação livre, pistas sem punição e conclusão anterior preservadas. Carreira continua governando a progressão.
- Etapas de código consecutivas, entrega completa em staging, sem flags. Produção depende da validação do usuário. Gravação dos vídeos é trabalho de conteúdo separado.

## Execução e evidência

- [x] Persistência de rascunho, operações concorrentes e publicação atômica.
- [x] Requisitos compartilhados, cabeçalho enxuto e apoio no player Kids/Adult.
- [x] Editor único por seções, recuperação, prévia e captura dos projetos.
- [x] Vimeo, importação, reimportação e atualização do material de autoria.
- [x] Fechar caminhos antigos de escrita e sincronizar Zappy na publicação.
- [x] Testes de concorrência, publicação, progresso, importação e mídia; migração em PostgreSQL descartável.
- [x] Tipos, lint, testes afetados e builds admin/Kids/Adult.
- [ ] Commit e push somente deste trabalho; acompanhar CI/staging e registrar limites de validação manual.

Evidências locais e limites de aceite: [relatório de autoria e rascunhos](../aulas-interativas/qa/autoria-rascunhos.md). A última etapa depende do resultado remoto do commit que contém este registro.
