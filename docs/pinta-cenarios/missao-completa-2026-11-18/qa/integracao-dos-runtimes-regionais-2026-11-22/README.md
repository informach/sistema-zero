# Revisão integrada dos jogadores regionais

Base `bb1fd30f7`, implementação integrada até `c34117d6a`, mais os ajustes de
testes identificados nesta revisão. Os contratos regionais permanecem privados:
nativo 8, físico 3, cena 4 e PNG 5 não são selecionados pelos fluxos públicos.
Esta prova não ativa um runtime, um catálogo ou o protocolo causal da nuvem.

## Resultados

- Core completo: 3.255 testes, 211.127 asserções, 205 arquivos, zero falhas.
- Pinta completo: 2.838 testes, 38.086 asserções, 267 arquivos, zero falhas.
  O processo usou o ambiente nativo com pygame-ce 2.5.8, Pygame Zero 1.2.1 e
  pyray 6.0.1.0; não substituiu esses testes por mocks gráficos.
- Studio focado: 32 testes, 291 asserções, seis arquivos, zero falhas.
- Tipos completos do Pinta, Biome dos três testes alterados e os três geradores
  Core/Python/JavaScript aprovados. O typecheck completo do Studio continua
  pertencendo ao próximo gate, após incorporar as mudanças concorrentes da staging.
- Inventário: repetição independente de 23 testes PostgreSQL, uma purga real,
  56 testes HTTP, 66 do BFF e 62 do cliente. A causalidade de escritores modernos
  com inventário parcial continua em implementação separada.

O candidato Python foi reconstruído a partir dos fontes integrados, com Bun
1.4.3 e biblioteca padrão compilada verificada. Seus 126 arquivos foram relidos
e conferidos por tamanho e SHA-256 antes de servir a distribuição
`b30e03e8387cc3f05f6f782993990bafdc64119941882c41ddc549c9cafc3e8c`.
Servidor QA local na porta 5569; sem publicação ou alteração de catálogo.

## Ensaios no navegador

| Recorte | Casos aprovados |
| --- | ---: |
| pygame-ce regional real em Wasm, escalas 1×/2× | 4 |
| Pygame Zero/Raylib 2D regionais e controles de imagens/protocolo 3D | 8 |
| Jogo 2D/Jogo 2D Avançado, desktop e toque emulado | 4 |
| Python legado: colisões, plataformas, portas, atualização da tela e nove jogos | 32 |

Os três recortes Python foram executados em Chrome e Chromium. O último inclui
PyDew Valley nos dois navegadores. O recorte regional confere 18 camadas,
animação, apoio por 40 quadros em plataforma fracionária e pixels específicos
da Cabana, seguidos da volta aos pixels da Vila. Os recursos privados continuam
compostos no código do projeto de prova; isso não equivale à distribuição pública
dos novos módulos ou à homologação final Pinta → Estúdio → jogo publicado.

## Problemas encontrados e corrigidos

1. A auditoria de células não registrava a nova fixture `regionPlatformPng.ts`.
   O arquivo foi revisado: escreve uma célula canônica inteira e delega admissão
   e codificação ao Core; não decodifica índices/flags manualmente.
2. A matriz visual ampliada fazia 576 renderizações dentro de um único prazo
   de 20 segundos. A execução completa excedeu esse prazo, sem divergência de
   pixels. Os 16 casos de transformações agora são independentes, preservando
   o mesmo prazo e todas as 192 comparações denso/regional e 192 com culling.
   O contexto de consulta é reutilizado entre quadros, como nos jogadores;
   cada imagem densa de referência é produzida uma vez para as duas origens.
3. Um teste antigo de cancelamento da nuvem esperava 200 ms para a fila alcançar
   o primeiro PUT. Sob carga essa espera terminou antes do evento. Agora aguarda
   `flush()`; o próprio primeiro PUT continua abortando a fila e o teste verifica
   que nenhum commit saiu. Não houve aumento de timeout ou mudança do produto.

Falhas anteriores e controles positivos estão preservados nos recibos. O índice
registra hashes dos fontes e dos arquivos comprimidos. Durações destes ensaios
não são benchmark de fluidez ou de consumo total de memória. Houve uso desta
máquina e toque emulado; não houve outro aparelho físico ou teste com crianças.

Continuam abertos a promoção dos formatos, o protocolo causal completo, a
integração pública dos cinco jogadores, os blocos e a versão Python combinada,
o IO sob demanda, as demais etapas profissionais e a homologação final da missão.
