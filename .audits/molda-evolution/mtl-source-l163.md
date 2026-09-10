# Fonte MTL, lote 163

## Referências e escopo

Consultado em 09/09/2026 o [manual original Alias|Wavefront de materiais](https://github.com/Alhadis/language-wavefront/blob/master/docs/mtl-spec.rst).
Ele distingue RGB, XYZ e curvas espectrais, dissolve com halo, reflexão e mapas
de altura. Opções aparecem antes do arquivo; offsets/escalas podem ter componentes
opcionais. Mapas modificam parâmetros do material. Bump é altura, não um normal
map pronto. Valores de cor podem sair do intervalo usual, sem justificar clamp.

As [extensões documentadas pelo TinyObjLoader](https://github.com/tinyobjloader/tinyobjloader/blob/release/pbr-mtl.md)
informam campos PBR, emissão, normal e transparência estendida. Seu
[contrato de textura](https://github.com/tinyobjloader/tinyobjloader/blob/release/tiny_obj_loader.h)
também documenta aliases bump/displacement e espaço de cor. O link do autor da
proposta PBR recusou acesso por robots; não houve tentativa de contornar essa
restrição. A implementação é própria, sem copiar loaders nem adicionar dependências.

Este é um leitor de sintaxe e dados fonte, não um renderizador MTL, validador de
todos os efeitos de iluminação, conversor PBR, resolvedor local ou importação
completa OBJ. Aceitar um parâmetro fonte finito não aprova sua conversão nativa.
Nada é carregado, executado ou escrito no editor. Originais não são arquivados
pelo AST; comentários, grafia numérica e espaços entre números não são um roundtrip
textual. O conjunto original deverá continuar disponível no fluxo de revisão.

## Decisões e arquitetura

`readMtlDocument` reutiliza `objStatements` e a sintaxe decimal estrita de OBJ.
Não há outro lexer. Mensagens comuns passaram a identificar OBJ/MTL; os limites,
ordem de erros e saída numérica/geométrica de OBJ permanecem. Sem Regex permissiva,
parseFloat parcial, eval, fetch, shell, include ou tratamento de URL.

Materiais são declarações em array com linha/nome/propriedades, não um objeto
indexado por nome. Nomes repetidos, vazios de conteúdo, `__proto__` e `constructor`
não colidem. Propriedades tipadas conservam ordem e redeclarações; d e Tr não se
substituem. Não aplicar último-valor, fallback de cor ou precedência PBR/Phong.
Ausência de uma propriedade continua ausência. Formas abreviadas da cor e fator
espectral omitido recebem apenas os defaults da própria sintaxe. Números Double
finitos, inclusive -0 e parâmetros fora de faixas usuais, permanecem sem clamp.
Ranges e conflitos que impeçam conversão serão tratados nessa etapa posterior.

Política própria de compatibilidade: nomes UTF-8 com espaços internos; keywords
case-sensitive com aliases explícitos `map_Bump`, `map_bump`, `map_disp` e
`map_Disp`; campos Pr/Pm/Ps/Pc/Pcr/aniso/anisor/Ke/Tr e respectivos mapas conhecidos.
Não inferir suporte a toda extensão a partir de um prefixo. Iluminação 0–10 é
conhecida; outro inteiro seguro não negativo é unsupported, sintaxe inválida é
invalid. Propriedade antes de newmtl é inválida, não material implícito.

`readMtlTexture` conserva filename literal e opções ordenadas, incluindo repetidas
e aridade dos vetores. Não materializa defaults de sampler/UV. Os mapas mantêm
papel distinto; canal escalar não é aplicado a cor/normal, bm só vale para bump,
tipo de ambiente só para reflexão e cc só para mapas de cor. Tipo de reflexão
é obrigatório. Resolução é inteiro seguro positivo, boost não negativo; mm/bm e
componentes de transformação podem ser negativos. Espaço de cor estendido fica
como nome, não uma conversão automática ou aprovação de gamut desconhecido.

Um vetor consome até três tokens numéricos. Nome numérico que poderia ser um
componente deve ser desambiguado com `./`, sem inventar um arquivo ausente.
Opções terminam ao começar filename; seu restante não é reprocessado como opções.
Espaços internos, percent-encoding, separadores Windows e nomes com sintaxe de
shell continuam dados inertes. Não normalizar ou decodificar caminhos aqui.
Aspas duplas não são interpretadas; caminhos assim são unsupported. Instrução ou
opção desconhecida falha sem retornar fonte parcial. Resolver caminhos fora da
pasta/URLs/procedurais é responsabilidade da etapa local, nunca autorização para IO.

Orçamentos fonte compartilhados: 32 MiB, 65.536 caracteres/linha, 1.048.576 linhas,
4.194.304 tokens. MTL adiciona 65.536 materiais, 262.144 propriedades, 262.144 opções
agregadas, 64 opções/mapa e nomes de 4.096 caracteres. Preflight antes do append
correspondente. Contagem agregada entre vários MTL ainda pertence ao resolvedor
do próximo lote. Não confundir teto por arquivo com teto de todo o conjunto.

## Revisão e verificação

Dez testes específicos cobrem declarações/propriedades repetidas, conflitos,
cores/curvas, opções/roles/canais, PBR, caminhos literais, inputs malformados,
limites exatos e excedidos, UTF-8/BOM/continuação, intervalo de bytes, memória
compartilhada recusada e ownership. Pureza inclui o novo grafo. A comparação com
MTLLoader real usa somente parse/getTextureParams: cores, escalares, UV e filename
de caso compatível concordam, nenhum material/textura é carregado. Não usar esse
oráculo como especificação dos casos que ele não valida ou preserva.

Review encontrou `-colorspace` sem valor consumindo `-clamp` como nome de espaço
de cor. Regressão vermelha reproduziu; o parser agora exige um nome antes da
próxima opção. Teste passou após correção, sem flexibilização. A primeira checagem
de tipos também identificou listas de fixtures ampliadas para string; os arrays
de valores literais passaram a preservar seus tipos literais, sem casts de dados
de produção, supressões ou relaxamento de asserção.

Focal final: 71 passes, zero falhas, 4.950 asserts/6,94 s. Tipos passaram, Biome:
850 arquivos. Benchmark OBJ normal passou os três goldens do lote 161 e manteve
todos os bytes fonte: triângulo p50/p95 0,162/1,456 ms; comentários 5,067/9,146 ms;
malha 51,613/60,279 ms. É uma verificação de hashes e uma amostra, não novo estudo
pareado, medição de pico ou alegação de ganho de CPU/GPU neste lote.

Integral final: 1.995 passes, zero falhas, 276 arquivos, 8.233.701 asserts/121,01 s.
Vite: 1,46 s, sem alteração de chunks e com aviso Three conhecido. Kids:
compilação 5,9 s, tipos 9,2 s, 59 páginas/514 ms. Diff check passou, somente avisos
CRLF existentes em outros CLAUDE.md. UI OBJ, recursos locais, conversão nativa,
revisão/adaptações, worker e ativação pública continuam fora deste lote.
