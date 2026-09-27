# Pesquisa de camadas bbmodel — continuidade após o lote 209

Referência: JannisX11/blockbench, commit
47e633e4a1338f957ee7baa0acbcf54da11e77df. Fonte GPL consultada para comportamento
e formato; nenhuma implementação copiada ou executada. Pesquisa parcial, não
aprovação de compatibilidade irrestrita. Implementação do subconjunto no lote 210,
com contrato e verificações em bbmodel-paint-layers-l210.md.

## Evidência primária lida em 09/09/2026

- Árvore js/texturing identificou layers.js, textures.js e painter.js.
- layers.js 1–60: TextureLayer possui canvas próprio; image.onload troca dimensões
  pelo tamanho natural da imagem. extend dá precedência a image_data sobre data_url;
  o ramo data_url começa com dimensões declaradas ou 16 e depois carrega imagem.
  image_data admite dados de sessão serializados. Não confundir esse ramo com o
  contrato persistido por getSaveCopy ou executá-lo em um importador.
- layers.js 96–124: getUndoCopy inclui uuid/texture; getSaveCopy copia propriedades,
  remove in_limbo, guarda largura/altura do canvas e data_url PNG. Não inferir UUID
  persistido de camada a partir do formato de undo.
- layers.js 371–377: name padrão layer; offset vector2; scale [1,1]; opacity 100;
  visible true; blend_mode padrão default e enum de onze modos (default,
  set_opacity, color, multiply, add, darken, lighten, screen, overlay, difference,
  alpha_mask); in_limbo false. Ainda conferir merges/defaults e valores nas versões.
- textures.js 1778–1818: updateLayerChanges retorna se layers desativadas ou largura
  zero; redimensiona canvas para dimensões da textura; percorre layers em ordem;
  ignora invisible/opacity zero. alpha_mask usa canal vermelho e offset (ramo
  específico, não o blend comum). Outros modos usam filtro opacity/100, função de
  composição de Painter, nearest via imageSmoothingEnabled=false e drawImage com
  offset e dimensões multiplicadas por scale. Reseta filtro/composição ao final.
  Somente quando update_data_url=true troca source por PNG do canvas composto.
- Busca em textures.js localizou getSaveCopy/extend nas linhas 310–373 e mudanças
  após edição em 1818+, mas os intervalos completos ainda precisam ser lidos.

## Contrato atual do Molda a respeitar

BbmodelAppearance guarda layers como readonly unknown[] e limita descritores,
não interpreta conteúdos. requireBbmodelFlatImage recusa layersEnabled antes de
recursos; bitmap source não é prova de composição equivalente.

SceneImageLayer guarda id/name/visible/opacity/pixels, bottom-to-top, com pixels
do tamanho da imagem. Não possui offset/scale/blend authoral. Native image tem
até 32 camadas e orçamento agregado de pixels. Caches compostos não são uma
segunda fonte persistida. Qualquer bake/crop/adaptação terá de ser explícito;
não descartar pixels fora da tela nem confundir um PNG composto com camadas
editáveis. Receptor bbmodel atual exige uma camada por imagem; precisará de
contrato/relatório e UI correspondentes ao ampliar essa conversão.

## Leituras complementares e decisão do lote 210

- textures.js 310–374: save copia propriedades, visible/internal/saved/uuid,
  retira selected, serializa layers por getSaveCopy quando ativas e source quando
  bitmap/internal. extend mantém a ordem das camadas e reutiliza UUID de sessão
  quando disponível; não torna UUID obrigatório no arquivo salvo de camada.
- textures.js 80–140: onload define largura/altura naturais da imagem da textura.
  Só copia pixels dessa imagem para o canvas quando layers_enabled é falso.
- textures.js 1750–1786, busca getDataURL: no desktop externo usa PNG do canvas;
  nos outros casos devolve source. Não é garantia universal de uma composição
  atualizada ou de preservação autoral de camadas.
- painter.js 1539–1578: default → source-over; set_opacity → source-atop,
  add → lighter; outros modos possuem operadores próprios. Não são equivalentes
  ao compositor normal nativo. alpha_mask tem ramo separado em textures.js.
- property.ts 1–185 e 176–255: vector2 sem default explícito começa em [0,0];
  vetores são copiados/mesclados como arrays. O leitor Molda exige eixos finitos e
  comprimento correto, não reproduz aceitação permissiva/coerção do editor.
- bbmodel.js 453–510: parser cria Texture para cada registro e depois escolhe
  recursos por caminhos locais/data source. bbmodel.js 50–120: migração de caminho
  pré-4.10 separada da migração de animação pré-5.0. Não há transformação de camadas
  nesse intervalo. Não foi executado o editor nem afirmada cobertura de todo plugin.

Subconjunto escolhido: PNG por camada, dimensões naturais iguais à textura,
offset [0,0], scale [1,1], blend default, visibilidade e opacidade 0–100 preservadas.
Sem crop/padding/flatten, inclusive para camadas ocultas ou de opacidade zero.
Imagem raiz apenas fornece dimensões/layout; pixels editáveis vêm das camadas.
Nome ausente mantém o default source layer; vazio/mais de 128 unidades recebe
nome nativo com registro do original. Dados de sessão image_data/in_limbo são
recusados; demais campos não mapeados exigem descarte explícito com caminho.
Camadas inativas continuam opacas e omitidas com relatório do bitmap plano.

Composição nativa é source-over em sRGB autoral, precisão completa entre camadas
e quantização no final (scene/composite.ts). Canvas pode ter arredondamentos e
premultiplicação por etapa diferentes: escolha e relatório explicitam adaptação,
não equivalência bit a bit. Misturas especiais, offset/scale e imagens parciais
continuam fora desse subconjunto, com recusa legível e sem fallback automático.
