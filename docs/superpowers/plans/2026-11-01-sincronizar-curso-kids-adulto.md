# Sincronização de curso Kids para adulto

**Objetivo:** atualizar o curso adulto existente com o conteúdo completo e publicado do Kids do mesmo ambiente, incluindo vídeos, PDFs, manifestos, blocos concedidos e voz do Zappy.

**Arquitetura:** operação explícita de autoria, com plano e cópia de segurança antes da aplicação. O planejador preserva IDs do destino e remapeia referências tipadas. Uma transação publica as aulas pelo repositório canônico e publica o curso. A preparação de mídia usa o Vimeo e a geração de voz oficiais do Admin, sem expor suas credenciais. Não cria sincronização automática entre cursos.

**Decisões:** preservar ID, slug e audiência do adulto, seu contexto de jornada quando a origem ocupa uma posição exclusiva do Kids, e todos os dados de alunos. Copiar as demais configurações, removendo metadados antigos do modelo vazio. A URL comercial troca somente o segmento `/kids/` por `/pro/`. Sem URL no Kids, preservar a URL adulta existente. Não remover módulos ou aulas excedentes silenciosamente. Recusar origem não publicada ou com rascunho diferente do publicado.

- [x] Planejador puro, mapeamento persistente, comparação semântica e testes negativos de referências, ambiente e conteúdo não publicado.
- [x] Executor transacional com conferência do plano sob trava, publicação canônica, rollback e repetição sem alteração.
- [x] Extração compartilhada de falas com o botão do Admin. Preparar áudios pelo cache oficial e conferir todos os vídeos no Vimeo antes da escrita.
- [x] CLI Railway com alvos explícitos, artefatos privados, hashes, limites de execução e sem credenciais em argumentos ou recibos.
- [x] Testes locais de banco descartável, tipagem, lint e revisão do diff.
- [x] Executar e conferir staging e produção independentemente para `cade-todo-mundo` → `cade-todo-mundo-adulto`. Publicar três aulas e o curso em cada ambiente.

## Conferência final

Comparar toda a árvore remapeada com a origem, incluindo autoria e plano de vídeos. Verificar novamente os hashes da origem, IDs adultos preservados, capas, animação do módulo, anexos, concessões, vozes e publicação. Nenhuma leitura do ambiente errado pode servir de entrada à aplicação. Os backups ficam em `.cache/course-audience-sync`, fora do Git, sem dados de alunos. Registrar contagens e resultados, sem tokens.
