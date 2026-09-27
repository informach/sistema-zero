# Recursos GLB/glTF, lote 139

## Contrato revisado

`readGltfBuffers` só aceita bytes já entregues pelo usuário: BIN, data URI base64
de buffer e arquivos locais. Não possui callback de carregamento, rede ou IO.
Faltantes são uma lista de caminhos exatos, sem resultado parcial. A conversão
semântica e o relatório de extensões/perdas continuam separados.

Caminhos relativos são resolvidos dentro do conjunto escolhido, a partir da
pasta da entrada. Unicode/percent-encoding é decodificado uma vez em cada segmento;
nomes entregues pelo host permanecem literais. Sem busca por basename, case folding,
URL absoluta, escape da raiz, separador escondido ou colisão após normalização.
Map evita propriedades especiais de objetos como chaves de arquivos.

Buffers precisam de tamanho inteiro positivo; referências não podem alcançar
bytes extras do recurso. BIN deve corresponder à declaração, com até três bytes
zero de padding. BufferViews possuem intervalos próprios conferidos, stride de
vértices e target válidos; roles/alinhamento dos accessors são o próximo leitor.

Contagens, caminhos e tamanho agregado de recursos únicos são conferidos antes
de copiar/decodificar. Faltantes participam com o tamanho mínimo declarado.
Recursos repetidos compartilham backing próprio, nunca Buffer.slice do usuário.
O teto de 32 MiB é de dados resolvidos, não promessa de pico de RAM: JSON, strings
base64 e grafo de metadados também usam memória. Não ativar isso no thread de UI
sem a tarefa cancelável prevista para importação.

## Achados e verificação

Oito testes de domínio e um de pureza adicionados. Duas falhas RED do review:
referências que terminavam em /. ou /.. viravam arquivos após remover segmentos;
target nulo era confundido com ausência. Corrigidos no normalizador e validação,
sem abrir exceções para as fixtures. Casos GREEN mantêm navegação ../ permitida
quando permanece dentro da raiz, campos opcionais ausentes e passos válidos.

Integral: 1.671 testes, zero falhas, 244 arquivos, 94,65 s e 8.196.810 expectativas.
Tipos identificaram anotação inferida estreita no helper de teste com SharedArrayBuffer;
anotação explicitada como Uint8Array, sem mudar código de produto ou execução do
teste. Depois: tipos, Biome/729, focais (38/0, 685 expectativas) e Vite/1,37 s passaram.
Kids passou: compilação/5,7 s, tipos/8,9 s, 59 páginas/698 ms. Diff check passou.
Sem homologação visual/GPU, modelo editável ou formato público.

Base: [glTF 2.0, §§2.8, 3.6.1, 4.4.3.3 e 5.10–5.11](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
