# Admissão privada do PNG regional no Estúdio

A biblioteca e os futuros consumidores do Estúdio usam a mesma leitura de mundo que o Pinta. O PNG original é o arquivo do material. A cena e os índices existem em memória enquanto o consumidor precisa deles.

## Implementação

- [x] Mover leitura PNG estática, CRC, iTXt e admissão de mundo para submódulos neutros do Core. Preservar os caminhos do Pinta com reexports. Declarar a mesma versão de pako, já no lock.
- [x] Em `pintaRegionalMaterial.ts`, capturar bytes, ID, dimensões e marcador antes da primeira espera. Conferir o SHA-256, o cabeçalho IHDR, o ID da cena raiz e o mundo todo. Recusar metadados de cena, mapa ou derivação paralelos.
- [x] Retornar o PNG original, o marcador estrito `{ dataVersion: 5, sourceId, sha256 }` e o mundo admitido. A biblioteca recebe o marcador e confere os bytes ao ler e gravar. O registro persistido usa o PNG e o marcador. A projeção do mundo fica fora da enumeração e da serialização do resultado.
- [x] Provar Vila/Cabana, pixels reais, cancelamento, mutação do buffer ou marcador, CRC, versões anteriores e limites de dados e de pixels. Conservar as receitas e dimensões anteriores e a ativação privada.

As dimensões e o custo do mundo são conferidos antes que o consumidor possa pedir a decodificação gráfica. O material mantém o teto de 800 mil caracteres do Estúdio. O leitor conserva os limites por imagem, mundo, metadados e índices já usados pelo Pinta.
