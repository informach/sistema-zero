# Base escalar MTL, lote 166

## Escopo e decisões

`planMtlBase` interpreta uma declaração já selecionada e imutável, não um
documento nativo completo. Retorna cor sRGB com alpha direto, RGB linear para
futuro bake, rugosidade/metal e índices fonte efetivos. Não lê opções de mapas,
caminhos, coordenadas ou pixels; estes índices não aprovam texturas.

O [manual MTL](https://github.com/Alhadis/language-wavefront/blob/master/docs/mtl-spec.rst)
distingue RGB/XYZ/espectral, dissolução com halo, iluminação e expoente Phong.
As [extensões PBR](https://github.com/tinyobjloader/tinyobjloader/blob/release/pbr-mtl.md)
acrescentam parâmetros próprios. O
[exportador Blender](https://github.com/blender/blender/blob/main/source/blender/io/wavefront_obj/exporter/obj_export_mtl.cc)
usa uma relação empírica entre rugosidade e Ns; isso não é equivalência de BRDF.

Política própria: espaço RGB obrigatório, sem quantização/clamp; XYZ/espectral
são unsupported. d e Tr coexistentes exigem prioridade explícita, mesmo quando
equivalentes. Halo selecionado é unsupported, não transparência constante.
Pr explícito vence Ns com relatório; converter só Ns exige optar pela inversa
empírica `1 - sqrt(Ns / 1000)`, no intervalo 0–1000. Não inferir metal de Ka/Ks.
Valores utilizados precisam caber em 0–1. Propriedades descartadas explicitamente
não são validadas como valores nativos. Defaults e campos omitidos são relatados.
Iluminação 1/2 é adaptada para PBR com aviso; outros modelos exigem opção própria.

Redeclarações exigem reject/first/last, separadas de duplicatas de nomes do lote
165. Aliases bump/disp dividem slot; instruções refl ficam separadas para não
apagar lados de ambiente. Saída conserva a ordem dos índices escolhidos, contém
apenas metadados/arrays próprios e não retém objetos de propriedades fonte.

## Arquitetura e revisão

Curvas unitárias exatas foram extraídas para `core/colorTransfer`, reutilizadas
pelo MTL, alias glTF e helper legado por byte. Preservados coeficientes, expoente,
branches, endpoints, clamp legado e comportamento NaN. Sem alteração de formato,
dependências, IO, editor, worker ou ativação pública.

Dez testes novos cobrem seleção/aliases, conflitos, valores escolhidos/ignorados,
defaults, precisão, ownership, opções estritas e getters de mapas que falham se
lidos. A comparação inicial supunha que Three usava curvas numericamente iguais:
dois testes falharam. Revisão do Three instalado 0.184 encontrou coeficientes
arredondados e expoente 0,41666. Produção não foi alterada para acompanhar essa
aproximação. O oracle agora usa limites analíticos do erro desses coeficientes,
enquanto goldens exatos, thresholds e roundtrip de todos os 256 bytes continuam
estritos. Focal dos dez testes: 1.205 asserts/467 ms, zero falhas.

Benchmark normal glTF passou com seus três hashes anteriores e fonte intacta:
16²×1, p50/p95 0,202/0,257 ms; 256²×4, 3,311/10,550 ms; 1024²×8,
72,504/96,671 ms. Não é estudo pareado nem alegação de melhoria de desempenho.

Focal final importadores/core/pureza: 372 passes, 37 arquivos, 38.783 asserts,
17,76 s. Tipos passaram; Biome verificou 862 arquivos. Integral: 2.025 passes,
zero falhas, 280 arquivos, 8.235.209 asserts/123,65 s. Vite: 1,10 s; worker glTF
180,44 kB (+0,02 kB), painel 35,35 kB; aviso Three conhecido. Kids: compilação
19,3 s, tipos 12,9 s, 59 páginas/730 ms. Diferenças de tempo desta execução não
são uma medição pareada. Diff check passou com avisos CRLF antigos.

## Próximo estágio

Mapas, canais, transformações e compatibilidade de amostragem vêm no lote 167.
Blender também emite normal RGB como map_Bump e roughness como map_Ns; não
interpretar esses nomes silenciosamente como altura e expoente, respectivamente.
Native base fica sob a pintura: cor sólida deste plano não pode ser usada como
fator de textura sem bake linear e base transparente. Raster, geometria com
transformação UV, montagem, worker/revisão/adoção OBJ e homologação seguem abertos.
