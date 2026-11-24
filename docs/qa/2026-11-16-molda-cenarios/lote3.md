# Lote 3 — editor visual e ensaio nativo

A interface usa os tokens, botões e fontes do Molda. Possui biblioteca, árvore, seleção múltipla, transformações, grupos, bloqueio, apoio, cópia/importação/exportação de projetos e recuperação por IndexedDB. Os mesmos comandos persistem pelo serviço e alimentam desfazer/refazer. A página administrativa fica em `/molda/cenarios` e exige administrador ativo.

O viewport é compilado separadamente do host. O teste usa o avatar Cute Characters, controlador, câmera, Rapier e controles de toque do jogo, com estado falso sem progresso de conta. O módulo reutiliza o preparo de GLTF, instâncias com morph targets e textos sobre madeira. O código de NPC continua sendo o existente; a Íris é representada como um ator único no documento importado.

Revisão própria: corrigida a ausência de morph targets nas instâncias; compartilhados acabamento e deduplicação de texturas; retorno imediato da porta do viewport permite desmontar carregamentos pendentes; dados de autoria e câmera permanecem separados. As fundações usam medidas locais e são recalculadas pelo terreno. O suavizador usa grade e não uma cadeia recursiva exponencial.

Evidências do primeiro teste Chrome dedicado: cópia do projeto, mudança de X do poço, desfazer, testar com avatar, caminhar e retornar, sem erros de página. Amostras: 60 FPS na abertura e 54 FPS ao final, 523 objetos no documento anterior utilizado pelo teste. Não representam desempenho em aparelhos físicos nem aceite artístico. O playground do navegador MCP ficou limitado a 1 FPS em segundo plano; esse resultado não foi usado como referência de desempenho.

Quatro testes geométricos verificam carimbos sucessivos, fronteira de setores, recorte de lago atravessando dois setores e resolução de apoio dependente. O protocolo MCP via stdio já tem teste real de conexão e validação; a revisão de sua operação com um viewport aberto pertence ao lote 6.

Ainda em execução: acabamento dos controles de paisagem, vínculos de aplicação ao `/macro`, validação ampliada, catálogo completo, ensaio programático e composição pelas imagens. Este registro não declara a ferramenta inteira concluída.
