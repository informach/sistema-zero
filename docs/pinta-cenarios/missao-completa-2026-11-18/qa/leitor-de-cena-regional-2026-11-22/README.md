# Leitor de cena regional — 22/11/2026

Base `327c9769a`. Contrato interno de cena 4, com leitor JSON no Core. As regras
de camadas, objetos, referências, recursos e animações são as mesmas do leitor
anterior, agora parametrizadas pelo formato das células. A API pública
`readPintaScene` continua admitindo somente 1–3; não há seleção pelo host,
emissão de cena 4, PNG 5 ou novo runtime neste lote.

## Contrato e orçamento

O transporte usa o codec compartilhado `i16le-base64-v1`, chunks de 32 × 32,
origem assinada e retângulo lógico de até 10.000 casas por eixo. Cada mapa ou
definição conserva seus limites de 32 camadas e 2.048 chunks/4 MiB de índices.
O leitor confere os cabeçalhos de todos os mapas e conjuntos antes de decodificar
o primeiro payload. Não materializa os espaços vazios do mundo.

O JSON tem limite próprio de 8 MiB UTF-8, conferido antes do parse. A guarda
agregada de índices deriva desse limite e do tamanho base64 do chunk existente:
no máximo 3.070 chunks/6.287.360 bytes, mesmo ignorando cabeçalhos e imagens.
Na prática, esses outros dados também precisam caber no arquivo. Isso não
altera os tetos da cena pública 1–3 e não é um orçamento de heap total.

O retorno do leitor é memória decodificada, com `Int16Array`; não deve ser
serializado como se fosse o DTO de transporte. O emissor futuro deve usar o
mesmo codec, preservar a admissão global e medir seu JSON antes de publicá-lo.
Formatos, campos e recursos não reconhecidos são recusados, sem normalização
que autorize uma cena parcial. IDs mantêm os limites do contrato de cena.

## Revisão e provas

- **3.214 testes completos do Core**, zero falhas/omissões; 160.353 asserções,
  200 arquivos, 14,82 s. **59 focados**, 1.102 asserções, quatro arquivos.
- **2.728 testes completos do Pinta**, zero falhas/omissões; 35.337 asserções,
  252 arquivos, 195,63 s, incluindo três controles Pygame com vídeo `dummy`.
- **624 comparações com o módulo do commit pai**: 48 controles válidos e
  576 recusas. Dados serializados e ordem/conteúdo dos erros idênticos nas
  cenas legadas 1–3. O script e seu hash estão nos recibos.
- Dois controles de mutação retiram as guardas, uma por vez: cada alteração
  faz o teste correspondente falhar. As fontes são restauradas e a regressão
  completa passa. Não são alegações de bugs históricos em um formato publicado.
- Casos de 32 camadas/4 MiB e de arquivo próximo ao teto com 3.000 chunks
  repartidos entre raiz e conjunto. Buffers decodificados não são compartilhados
  indevidamente. Coordenadas negativas, oito transformações quadradas,
  propriedades, animações e referências sobrevivem à leitura.
- Cabeçalho tardio incompatível e excesso agregado são recusados com **zero
  decodificações** anteriores. Campos futuros, duplicatas, dimensão, índices,
  destinos de arte e metadados inválidos também são recusados.
- **67 ensaios Chromium aprovados sem retry**: 55 da matriz de persistência
  (desktop/CPU 4×), incluindo quatro novos do leitor, e 12 Pinta–Estúdio nos
  formatos publicados. Tipos completos Core/Pinta/Estúdio, lint dos sete
  arquivos e whitespace aprovados.

Os ensaios novos de navegador usam fixtures de contrato, com imagens de teste;
não são um novo exportador funcional da Vila ou um teste gráfico de cena 4.
Medições anexadas contabilizam o tempo do leitor JSON/decodificação, sem renderer
ou gesto da oficina. Duas observações desktop/CPU 4× não estabelecem p95 ou SLA.

A primeira checagem de tipos encontrou a substituição de `sets` ainda com tipo
de payload opaco e um contexto de validação excessivamente amplo. Corrigidos
pela separação do corpo/camadas decodificadas e pelo contrato mínimo `addIssue`.
Uma comparação de fixture foi explicitamente tipada como `unknown`, sem alterar
o JavaScript executado. Logs conservados separadamente.

Sem mudança visual ou funcional 3D, implantação, login, novo dispositivo físico
ou homologação externa regional. Contratos ativos continuam nativo 7, físico 2,
cena 3/PNG 4 e nuvem 6. Emissor/PNG e leitores dos motores, integração pública,
inventário parcial da nuvem e demais etapas da missão continuam em andamento.
