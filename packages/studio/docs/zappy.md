# Zappy do Studio

O tutor é uma integração opcional e somente leitura do `StudioEditor`. O host injeta
`tutor: StudioTutorConfig`; `StudioLesson` deliberadamente não expõe essa propriedade.

O Studio entrega ao adapter apenas modo, tipo do projeto, árvore compacta de blocos,
extensões instaladas, bloco selecionado, último erro e, fora do modo Blocos, código textual
limitado. Assets, data URLs e binários são removidos. O host é responsável por sessão, quota,
persistência, provedor e autorização.

O botão da barra abre um diálogo lateral sem remontar Blockly ou Monaco. Referências validadas
podem centralizar uma instância existente ou abrir a categoria que contém o `blockType` exato;
o rótulo da categoria é apenas fallback exato. O tutor nunca altera o projeto.
Tentativas repetidas após falha reutilizam o mesmo `clientMessageId`, e o cooldown usa timeout
finito. Referências de aula com `courseSlug` viram chips somente quando o host fornece
`openLesson`; respostas históricas sem slug continuam legíveis, sem link quebrado.
O catálogo autoritativo é exportado em `@sistemazero/studio/server-catalog`, e os manuais oficiais
server-safe em `@sistemazero/studio/server-knowledge`.
