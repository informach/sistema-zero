# Compatibilidade com o Tiled

O importador aceita mapas ortogonais finitos em JSON ou TMX e folhas externas TSX. A galeria
recebe os arquivos de mapa e dependências, ou um ZIP, em **Trazer mapa**. A escolha do mapa e
o relatório de conversão aparecem antes de confirmar a entrada na biblioteca.

| Recurso | Tratamento |
|---|---|
| Gids e oito transformações | conversão dos bits Tiled para a célula Pinta e volta |
| Grupos, visibilidade, opacidade, offset e parallax | preservados |
| Camadas com várias folhas | separadas por folha, com aviso no relatório |
| Dados XML, CSV e base64 gzip/zlib | leitura com limite de tamanho |
| Ponto, retângulo, elipse, polígono e polilinha | preservados com transformação |
| Objetos de peça e imagens de arte | referência visual; âncora Tiled convertida |
| Propriedades e referências | inteiro, decimal, cor, objeto e arquivo/desenho |
| Animação e terrenos Wang | quadros/duração, canto/borda/misto e cores |
| Conjuntos vinculados | objeto original e definição em metadados `pinta:*`; expansão visual para outros leitores |
| Arte RGB/alpha externa | quantizada para a paleta nativa, com relatório |
| Mapa infinito, isométrico ou hexagonal | recusado explicitamente |
| Peças não quadradas ou tamanhos fora de 16/32/48 | recusados na conversão para o editor |
| Margem/espaçamento de atlas | recusa explícita na conversão nativa |

Propriedades `pinta:*` conservam IDs, referências, papéis, frente, colisão e conjuntos na ida e
volta. O Tiled mostra a expansão visual do conjunto em grupos gerados. O importador do Pinta
reconhece essa expansão e restaura a instância original, sem duplicar o conteúdo.

Os caminhos de imagens são resolvidos relativamente à folha externa. O ZIP recusa caminhos
que saiam do pacote; o XML recusa DTD. Descompactação, quantidade de células, folhas e tamanho
de arquivo têm limites antes da criação dos desenhos.

Verificação em 17/11/2026: a referência passou pelo JSON e TMX/TSX do nosso leitor, pelo
Tiled 1.12.2 real via `--export-map json` e pelo Phaser embutido. Os testes de ida e volta
comparam células, flags, camadas, objetos, propriedades, animação, terrenos e conjuntos.
O [relatório de homologação](homologacao.md) registra os comandos reproduzíveis.
