# Recursos bbmodel, lote 179

## Escopo e fontes

Implementação própria de escolha e materialização de bytes, não pixels ou adoção.
Semântica de caminhos conferida na [documentação bbmodel](https://www.blockbench.net/wiki/docs/bbmodel/)
e no [codec fixado](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/bbmodel.js).
Campos de fontes conferidos em [Texture](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/textures.js).
Pesquisa detalhada em `bbmodel-resource-research.md`; nenhum código GPL incorporado.

## Implementação e revisão

Extração mecânica do algoritmo Data URI de glTF para núcleo neutro com política
de erros/orçamentos; base64 e octetos percent-encoded, sem interpretar estes
como texto UTF-8. PNG/JPEG são os únicos MIME aceitos; não executar SVG/HTML ou
buscar URL. MIME não comprova assinatura ou conteúdo de imagem. Adapter glTF
conserva contrato e algoritmo, incluindo preflight antes de bytes decodificados.

Caminhos OBJ compartilham núcleo literal com bbmodel. Referências adaptam
backslash; nomes de arquivos escolhidos não. Sem percent-decode, basename,
case-folding, acesso absoluto ou travessia fora do conjunto escolhido. 4.9 usa
entrada como diretório; 4.10/5.0 usam diretório pai. Erros mantêm tipo/path do
formato e causa neutra. Referência ao próprio arquivo de entrada é inválida.

Preferência explícita por embedded/files. Fonte alternativa só é usada se o
campo preferido não existir/estiver vazio, nunca depois de URI inválida ou arquivo
faltante. Campo path separado não é resolvido: dependia do ambiente desktop.
Bindings registram fonte, alternativa existente e path ignorado para revisão
posterior. Texturas não selecionadas não são decodificadas.

Todos os arquivos escolhidos passam por preflight: tipo de bytes, ausência de
memória compartilhada, caminhos únicos diferentes da entrada, 32 MiB cada,
64 MiB incluindo entrada e 1.024 companions. Recursos selecionados têm teto
separado de 1.024/32 MiB agregados. Dedup por URI exata ou caminho literal em
Maps separados, nunca por conteúdo ou chave textual com prefixo compartilhado.
Isso evita confundir uma URI inválida `file:texture.png` com arquivo já resolvido.

Todos os planos conferidos antes de decode/cópia. Faltantes únicos em ordem de
seleção, sem payload parcial; fonte inválida disponível continua erro mesmo se
outra está faltando. Saída own U8 com tamanho exato, inclusive entrada Buffer/
subarray; cada recurso único compartilhado readonly por contrato. Não há IO,
cache entre importações, decodificação de pixels, derivação de frames ou PBR.

Review encontrou duas regressões antes da correção: colisão de namespace e
autorreferência, inicialmente 0 passes/2 falhas, depois 2 passes/zero falhas.
Testes novos também tiveram expectativa incorreta para escape da pasta, corrigida
para unsupported conforme contrato existente; algoritmo não foi alterado nisso.

## Evidências finais

Focal: 110 passes, zero falhas, 7.047 asserts, sete arquivos, 3,22 s. Tipos e
Biome (956 arquivos) passaram. Integral: **2.183 passes, zero falhas, 301 arquivos,
8.238.693 asserts, 136,20 s**, exit 0. Vite 1,20 s; worker glTF 182,26 kB
(+0,29), OBJ 157,14 kB (+0,13), Three 579,29 kB com aviso >500 kB. Kids exit 0:
compilação 6,0 s, tipos 9,3 s, 59 páginas em 739 ms. Diff check passou,
apenas os três avisos CRLF prévios em CLAUDE de outros pacotes.

Benchmark glTF materiais, warmup 3/amostras 10, Ryzen 5 5600G/Bun 1.3.11:
p50/p95 0,190/0,244 ms (16²×1), 3,456/7,889 ms (256²×4), 79,191/109,419 ms
(1024²×8). Três hashes dourados preservados, fonte intacta. Execução de regressão,
não experimento pareado nem prova de ganho CPU/RAM. Sem novas dependências,
UI bbmodel, ativação pública ou homologação visual.
