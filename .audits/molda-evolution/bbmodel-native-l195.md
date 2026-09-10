# Composição e relatório bbmodel, lote 195

## Implementação

convertBbmodelDocument reúne os estágios privados em uma conversão síncrona do
formato free: versões 4.9, 4.10 e 5.0; hierarquia, geometrias editáveis, coordenadas,
UV, imagens simples/flipbooks e materiais. Resultado é ready com documento nativo
validado e relatório review=required, ou missing com todos os caminhos faltantes.
Não há documento parcial, adoção, IO, relógio, ID aleatório nem execução de fonte.
Identidade é escolhida pelo host e validada antes dos arquivos; bytes originais
não são arquivados pelo resultado. Formato público permanece 1.

Todos os campos de opções são validados/snapshotados antes da fonte, inclusive
etapas vazias. Grupos de opções têm caminhos qualificados e causa original.
Preferência embedded/files é obrigatória. Reuso do preflight local de recursos
confere todos os arquivos/aliases e o total de 64 MiB antes de parsear JSON;
nenhum byte é copiado por esse preflight. A seleção de recursos usa os vínculos
das faces retidas, antes de materializar XYZ/UV, sem procurar uma textura padrão.

Os leitores de TODOS os nós conhecidos (incluindo não listados/omitidos), geometria
e aparência continuam obrigatórios. O orçamento conjunto soma materiais padrão de
peças aos materiais de textura. Seleção/topologia e inspeção de campos restantes
alimentam o relatório limitado antes de posições/UV; demais etapas acrescentam
seus diagnósticos antes de avançar. Geometria é construída usando os IDs planejados
antes de abrir recursos ou pixels. Camadas ativas são recusadas pelo mesmo gate
usado no materializador de imagens, agora também antes dos recursos.

O relatório preserva diagnósticos discriminados de 14 etapas, recursos escolhidos,
alternativas/caminhos absolutos ignorados, omissões e custos nativos calculados
pelo contador comum. Teto de 65.536 issues, 64 Ki caracteres por caminho e 4 Mi
caracteres de chaves/valores textuais; não mede bytes serializados ou pico de RAM.
Não há truncamento silencioso nem subárvore externa dentro do relatório.

## Cobertura de campos restantes

assessBbmodelRemainder recebe contexto nomeado com estágios privados correspondentes.
Campos não mapeados em raiz/meta/resolução, nós/faces selecionados, ocorrências do
outliner e texturas/grupos usados são recusados por padrão. Descarte explícito
relata cada caminho sem ler, copiar, executar ou percorrer o valor desconhecido.
Subárvores/nós e texturas inteiramente omitidos já são cobertos por seleção e
contagens de origem. Metadados auxiliares não são arquivados no documento.

Campos conhecidos NÃO estão liberados de suas políticas: sombreado/wrap/PBR,
camadas ativas, referências e limites ainda passam pelos respectivos leitores.
Grupos inline antigos têm children processado pelo grafo; grupos separados de
5.0 não o têm silenciosamente coberto. Faces extras de cubo já eram recusadas
pelo leitor geométrico e continuam recusadas mesmo com unmapped=discard.

Clipes e controladores ainda não convertidos exigem animations=omit para abrir
cópia estática. A omissão relata quantidade separada e não valida nem executa
conteúdo interno/Molang. Não é suporte a animação de peças. Arrays malformados
não viram listas vazias; campos auxiliares de animação seguem o gate de campos
não mapeados. Camadas inativas mantêm diagnóstico de omissão; ativas não são
substituídas por uma imagem possivelmente desatualizada.

## Review e fontes

Código de composição revisado junto aos contratos dos lotes 175–194, leitor
nativo e caminhos de recursos. [Codec bbmodel](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/bbmodel.js)
conferido no cache fixado para objetos serializados, grupos separados e campos
adicionais. Nenhuma fonte GPL copiada/executada. Reuso dos utilitários nativos
de identidade, custos, nomes, limites, PNG/JPEG e geometria.

A primeira checagem de tipos dos testes apontou acesso a north em uma união de
fixtures mesh/cube; o fixture passou a declarar a face pretendida explicitamente.
Um teste combinado esperava descartar face extra de cubo; a falha mostrou a
recusa mais cedo já correta. O teste foi separado para provar que descarte de
campos não contorna essa proteção. Não se afrouxou o leitor de cubos.

## Evidências

16 novos testes: zero falhas, 176 asserts, 725 ms. Três revisões pelo percurso
completo, documento e GLB/Khronos com PNG decodificado independentemente por
libvips; determinismo, identidade/hierarquia/custos, ownership de bytes/imagens/
cores, relatório por estágio, faltantes relativos por revisão sem fallback,
metadados inválidos em peças omitidas, omissão de clipes/controladores, flipbook
e camada inativa, modelo vazio, opções null/desconhecidas, origem compartilhada,
limites agregados de arquivos/texto e guards antes de coordenadas/pixels.

Tipos passaram; Biome 1.001 arquivos passou. Focal ampliado: 160 passes, zero
falhas, 66.769 asserts, sete arquivos, 3,38 s. Integral: **2.387 passes, zero
falhas, 320 arquivos, 8.320.841 asserts, 138,24 s**, exit 0. Vite 1,33 s com
os mesmos chunks/CSS e aviso Three >500 kB; Kids compilou em 5,7 s, tipos em
9,5 s, 59 páginas em 601 ms, exit 0. Diff check passou com os três avisos CRLF
anteriores. Nenhuma medição nova de performance foi realizada neste lote.

## Pendências

Worker/protocolo, interface de revisão com prévia e adoção transacional ainda
não conectados. Animações de peças, camadas ativas/PBR completos e formatos fora
de free ainda não convertidos. Sem ativação pública, nova dependência ou benchmark;
resultado não prova desempenho GPU, toque, hardware alvo ou uso por crianças.
