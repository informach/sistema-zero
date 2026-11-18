# Lote 8.2 — Conteúdo binário e consultas de alturas

18/11/2026 · `staging` após `8e9d0a710` · **8.2 permanece em andamento.**

`conferirConteudoCompilado` confere o inventário antes de inspecionar os bytes: medidas reais dos GLBs, dimensões das imagens, PNG cinza16 de alturas, campo Float32 little endian e máscara por célula. Recusa medidas declaradas incompatíveis, campos sem terreno, corrupção/bytes após IEND, valores não finitos, alturas fora do intervalo e máscaras diferentes de 0/1. PNG e alturas físicas precisam corresponder dentro da quantização e do arredondamento Float32. O orçamento inclui os dados decodificados. Imagens comuns usam o preflight compartilhado; a falha posterior do decoder nativo ainda deverá impedir o carregamento da cena inteira.

O terreno compilado passa pelos mesmos limites do schema autoral. A consulta `criarFonteDeAlturasCompilada` reutiliza a interpolação triangular e o domínio existentes. Conserva peças ausentes, limites externos, fundo, recortes e buracos; altura e chão disponível continuam conceitos distintos. Os buffers da consulta são próprios. A função de interpolação passou a aceitar dados somente de leitura em Float32 ou Float64, sem mudar a precisão de edição do terreno.

## Verificação e revisão

- Núcleo completo: **344 testes / 10.561 verificações**, sem falhas; tipagem passou.
- Motor completo: **202 testes / 4.249 verificações**, sem falhas; tipagem, Biome dos arquivos e `git diff --check` passaram.
- Conteúdo adulterado com hashes recalculados continua recusado por suas medidas/valores reais. Testados CRC do PNG, profundidade de bits, resolução, divergência do campo, máscara e cancelamento.
- Consulta física comparada com a fonte autoral em uma grade de amostras, incluindo transições para peças ausentes. Diferença menor que 0,00001 m. Teste específico distingue interpolação triangular de bilinear. Alterar os buffers recebidos não modifica a consulta.

Este recorte não entrega o pacote completo. Continuam pendentes a materialização final de setores, caminhos e água, colisões, montagem do manifesto e os ensaios integrados/ciclos. Só depois será possível fechar 8.2 e prosseguir para 8.3; lotes 9–10 e implantação continuam aguardando o fechamento global.
