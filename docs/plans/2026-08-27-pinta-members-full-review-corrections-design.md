# Correção dos achados do full review de 26/08/2026

## Objetivo

Corrigir todos os achados do lote implementado em 26/08/2026. A entrega fecha a brecha de quota da biblioteca de paletas, trata imagens sem peças importáveis, faz stores e abas convergirem, remove código morto, corrige a direção das dependências internas, reduz a responsabilidade da galeria e fortalece os testes de backup.

## Contrato da biblioteca especial

O contrato compartilhado definirá a identidade completa da biblioteca: ferramenta Pinta, item `sz-pinta-palettes` e kind `palette-library`. Uma função pura classificará cada criação como biblioteca exata, marcador parcial inválido ou criação comum.

O Members rejeitará marcadores parciais na borda da aplicação. Somente a identidade exata ficará fora da quota de itens; os bytes continuarão contando. A regra também impedirá que o item especial vire desenho comum ou que um desenho comum assuma apenas parte da identidade especial. Serviço, repositório Drizzle, consulta de uso e fake em memória usarão o mesmo contrato.

## Importação de imagens

O corte de peças usará dimensões arredondadas para cima e preencherá as bordas incompletas com transparência. Assim, uma imagem menor que a peça gera uma peça válida e pixels das bordas deixam de ser descartados.

Uma imagem sem pixels visíveis continuará sem peças, mas o diálogo bloqueará o avanço e mostrará uma mensagem específica. A prévia informará o fallback para a paleta Arcade em vez de dizer que criou uma paleta com zero cores.

## Convergência da biblioteca de paletas

`savePaletteLibrary` devolverá a biblioteca saneada que a transação realmente gravou depois do merge. A store atualizará a memória com esse valor autoritativo, não com a versão anterior ao merge. O adapter de nuvem dos Kids preservará o mesmo contrato.

A persistência local publicará mudanças para outras instâncias da página e para outras abas por `BroadcastChannel`. Cada store inscrita relerá o registro autoritativo. O emissor aplicará diretamente o retorno do save; os demais consumidores reagirão ao evento. Esse fluxo evita loops e faz duas stores independentes convergirem depois de escritas concorrentes.

## Arquitetura interna do Pinta

O código removerá `quantizeToIndexed` e os helpers e testes usados somente por ele. `quantizeFrames` passará de `export/` para um módulo neutro em `core/`, consumido pela exportação de GIF e pela extração de paleta de uma imagem.

A seleção da galeria sairá de `GalleryScreen`. Um hook focado cuidará de entrada e saída do modo, toggles, poda de ids removidos, Escape, contagem viva e proteção contra fechar uma sessão alterada durante um ZIP assíncrono. A tela continuará responsável por renderizar e disparar downloads.

## Testes e validação

Cada bug receberá uma regressão que falha no estado anterior. O Members cobrirá falsificação da identidade especial, transições inválidas e contagem exata no fake e no Postgres. O Pinta cobrirá imagem pequena, imagem transparente, retorno autoritativo do merge e convergência entre duas persistências e duas stores.

Os testes do ZIP compararão todos os arquivos internos, os dois LEIA-MEs completos e os bytes do backup padrão com a variante `gallery` explícita. A validação final executará testes, typecheck e Biome de Core, Pinta, Members e Community Kids, além de `git diff --check`. Testes PostgreSQL serão executados quando o banco local na porta 5433 estiver disponível; qualquer indisponibilidade será relatada separadamente.
