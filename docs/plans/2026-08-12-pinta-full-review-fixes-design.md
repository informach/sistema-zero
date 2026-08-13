# Correções do full review do Pinta

Data: 2026-08-12

## Objetivo

Corrigir os seis bugs confirmados no full review do Pinta, fechar a janela de vazamento de `objectURL` encontrada no editor de mapas e oferecer cinco fontes selecionáveis para textos vetoriais. As mudanças preservam os entrypoints públicos, o formato do backup e o limite atual de 32 MiB.

## Decisões

### Orçamento de dados

O encoder do `.pinta.json` será a fonte única do tamanho portátil da galeria. Toda mutação persistente validará o estado projetado contra o mesmo limite de 32 MiB usado pelo restore.

Galerias legadas acima do limite continuarão carregáveis. O Pinta aceitará uma mutação apenas quando ela deixar a galeria dentro do limite ou reduzir seu tamanho. Exclusões permanecem disponíveis. A UI mostrará um erro específico quando o orçamento impedir um save, create, duplicate, import ou edição.

### Isolamento do cache

O namespace de armazenamento fará parte da identidade do cache de miniaturas do subpath `studio-library`. Trocar de perfil não reutilizará dados derivados de outro IndexedDB, mesmo quando ids e timestamps coincidirem.

### Inserção de assets

O conteúdo vetorial inserível será o conteúdo visível. Shapes ocultos não participarão de contagem, bounds, escala ou clone.

Um predicado barato decidirá se um asset pode aparecer no seletor. A busca não rasterizará bitmaps. O preview será memoizado pela identidade do asset, e a rasterização completa ocorrerá apenas ao renderizar a miniatura ou confirmar a inserção.

O comando de inserção devolverá sucesso ou falha. O modal fechará somente depois de um commit bem-sucedido.

### Acessibilidade do modal

O `Dialog` instalará listeners de `keydown` e `focusin` no documento enquanto estiver aberto. O trap funcionará mesmo quando o foco escapar do subtree do modal. O cleanup removerá listeners antes de restaurar o foco anterior.

### Lifecycle de URL

O efeito que rasteriza tilesets vetoriais revogará sua `objectURL` em `load`, `error` e cleanup, com guarda idempotente.

### Fontes vetoriais portáteis

Textos vetoriais poderão escolher entre `Baloo 2`, `Nunito`, `Press Start 2P`, `Bungee` e `Fredoka`. O modelo persistirá uma chave estável da fonte e tratará documentos antigos sem essa propriedade como `Nunito`.

As fontes serão distribuídas pelo próprio Pinta e registradas no editor, sem depender da instalação local. Toda saída que contenha texto — SVG avulso, PNG, spritesheet, tileset e mapa — usará um SVG autocontido com apenas as fontes necessárias incorporadas como `data:`. Assim, o mesmo arquivo intermediário alimentará tanto o download vetorial quanto as rasterizações, evitando divergência entre formatos.

O seletor aparecerá nas propriedades da ferramenta de texto e também editará a fonte do texto selecionado. Bounds e hit testing continuarão determinísticos, usando um fator de largura específico por família; a geometria permanece uma aproximação, mas deixa de assumir uma única métrica para todas as fontes.

## Testes

Cada causa raiz receberá uma regressão antes da implementação:

- backup/galeria projetada acima de 32 MiB;
- cache com mesmo id/timestamp em dois namespaces;
- inserção com shape oculto distante;
- filtro de busca que não acessa pixels;
- modal que recupera foco externo e mantém o foco ciclado;
- modal de inserção que permanece aberto na falha;
- cleanup da `objectURL` antes do carregamento.
- sanitização e round-trip das cinco famílias;
- alteração da fonte no editor e em textos já selecionados;
- SVG autocontido com a fonte usada, sem incorporar famílias não usadas;
- rasterizações e folhas usando o mesmo SVG autocontido.

Depois dos testes focados, executar: suíte completa do Pinta, typecheck, Biome, build do playground e testes de integração selecionados do `community-kids`.
