# Coordenadas locais bbmodel, lote 185

## Implementação e limites do contrato

Conversão própria de pontos locais sobre a fonte tipada, planos topológicos
orçados e transformações de repouso correspondentes. Não materializa faces,
materiais, hierarquia nativa ou documento; não lê UV, pixels, normais ou raw
restante. Não realiza IO, revisão do usuário ou adoção.

Cubos: semi-extensão = ((to-from)/2 + inflate)*stretch; centro autoral =
from+(to-from)/2; endpoints resultantes subtraem o próprio origin. boxMesh
próprio fornece oito pontos na mesma ordem binária do plano. Rescale continua
exclusivamente no TRS do nó: não é aplicado novamente às coordenadas. Malhas
já possuem coordenadas locais, portanto seu origin não é subtraído dos pontos.

Fonte [Cube](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/cube.js)
consultada sem executar/incorporar código GPL. Não imita engrossamento implícito
de 0,001 da prévia. Eixo zero/invertido exige nonPositiveCubes:preserve ou é
unsupported; preservação relata quantidade de eixos, não ordena endpoints nem
promete shading equivalente. Colapso numérico após localização também é eixo
zero; overflow aritmético não vira valor corrigido.

Todos os pontos retidos são conferidos em local e após transformação world,
inclusive pontos sem faces, ocultos e não exportáveis. Valores que resultam em
Infinity/NaN em Float32 são unsupported com caminho de origem. O mesmo vale
para os oito cantos da AABB local transformada, pois bounds nativo usa essa
caixa, que pode exceder Float32 mesmo com pontos autorais representáveis.

Saída Float64 própria, signed zero e frações preservados. Componentes não-zero
que virariam zero em Float32 geram aviso por ponto/local ou world, sem arredondar
a fonte/destino. É conferência de representabilidade numérica, não simulação
do shader, garantia de enquadramento de câmera ou homologação GPU. Domínio
nativo Float64 não foi alterado; leitura/composição completa e build real das
faces continuam obrigatórios posteriormente.

Opções estritas; mismatches estruturais entre estágios privados são erros de
programação antes dos valores. Esses checks não autenticam mutações arbitrárias:
fonte/plano/poses correspondentes e imutáveis são o contrato síncrono interno.
Resultados de chamadas distintas e fonte não compartilham buffers editáveis.

## Review e evidências

Nove testes novos: todas as revisões, endpoints calculados independentemente,
Three Object3D CPU com hierarquia/Euler diferentes por família/rescale, propriedade
dos buffers, duplas/signed zero, consentimento/contagens de zero e inversão,
overflow derivado/local/world/bounds, pontos sem superfície, omissão estrutural,
malha vazia e getters de prova para dados que este estágio não consome.
Fixture decimal ajustada para seu literal Float64 exato após lint de precisão;
nenhum matcher ou limite relaxado. Testes não executam uma sessão Blockbench/GPU.

Focal final: 114 passes, zero falhas, 11.113 asserts, cinco arquivos, 2,99 s.
Tipos e Biome 969 arquivos passaram. Integral final: **2.241 passes, zero falhas,
307 arquivos, 8.253.024 asserts, 136,26 s**, exit 0. Vite 1,22 s, chunks mantidos
(matrix 2,11 kB, glTF 182,26 kB, OBJ 157,14 kB, Three 579,29 kB com aviso >500 kB).
Kids exit 0: compilação 5,6 s, tipos 9,3 s, 59 páginas em 620 ms. Diff check
passou com os três avisos CRLF prévios. Lote encerrado.

Sem novas dependências, benchmark ou ganho de CPU/RAM alegado. UI bbmodel,
materiais/UV/normais/animação, documento/worker e ativação pública pendentes.
