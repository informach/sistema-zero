# Clipes glTF nativos, lote 157

## Contrato

Converter TRS selecionado para espaço local absoluto, mirando nodeIds da
hierarquia (grupo/osso quando há forma separada). STEP/LINEAR mantêm tempos
Float32 originais em Double, sinais e valores, sem snap de FPS. Propriedades
não animadas continuam no transform base. Loop é opção, false por padrão: glTF
não define reprodução automática ou repetição. FPS padrão 30 é grade de edição.

Duração preserva o maior tempo dos canais autorados do clipe, incluindo caudas
de canais fora da cena e omitidos; samplers não referenciados não a estendem.
Clipes sem trilhas editáveis são omitidos e relatados. Pose só em zero usa
1/FPS de duração positiva, com aviso, sem deslocar a chave zero.

Normalização é opt-in apenas para chaves que ultrapassam o contrato nativo 1e-6;
conserva sinais e relata quantidade/maior erro. Não reduzir a tolerância glTF
nem relaxar a nativa. Morphs e alvos não resolvidos são recusados por padrão;
opção de omissão os lista, sem convertê-los em transformação ou executar código.
Canais fora da cena são listados com caminho fonte, sem ler seus valores.

CUBICSPLINE exige bake explícito. União ordenada da grade FPS e de TODAS as chaves
originais, com igualdade numérica exata, apenas entre endpoints do canal. Não
trocar spline por smooth nativo. Sampler glTF calcula as amostras, que se tornam
chaves lineares; relatório informa quantidade e FPS. Isso é aproximação entre
amostras, não prova de erro limitado ou validade da curva no contínuo. Quaternion
nulo numa amostra é erro com caminho completo do clipe/canal, não identidade.

## Arquitetura e limites

Plano de metadados verifica 64 clipes, 4.096 trilhas, 65.536 chaves e 600 segundos
antes de valores. Chaves contam por alvo, não só por sampler compartilhado.
Para cubic, mínimo é max(chaves originais, pontos da grade); segunda passagem
forma união exata limitada, antes de abrir qualquer output. Cache de agenda por
input e valores LINEAR/STEP por accessor, restrito à conversão. Cada trilha/chave/
tupla final é própria; não retorna views numéricas nem referência à fonte.
Estágio não lê geometria/imagens, grava, toca clipe ou aceita perdas pelo usuário.

Review identificou que accessor sem bufferView/sparse pode declarar bounds
arbitrários para extensões, embora o core lido seja zero. Usar seu max como duração
recusava uma pose zero por supostos 900 s. Regressão vermelha antes do ajuste;
planejador usa faixa core zero nesse caso, preserva bounds de origem e não altera
o leitor. Fontes: [bounds glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#accessors-bounds),
[animações glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#animations).

## Testes e review

Onze testes: tempos fora da grade, STEP/LINEAR, nomes/loop, ownership, duração
preservada com canal externo mais longo, omissão explícita de alvo/morph, bake
com todas as chaves e diferença entre amostras documentada, quantização signed
de quaternion, zero cúbico, bounds implícitos e opções. Limites exatos e excedidos
de clips/trilhas/chaves, getters que impedem leitura precoce, união cúbica que só
excede no merge e duração máxima são exercitados.

GLBs reais: junta carregando forma e filhos rígidos, assistência local e
local-delta, duas instâncias espelhadas. Conversores reais de geometria,
hierarquia, materiais, skins e CLIP montam o documento do teste. Leitor nativo
passa; prepareSceneAnimation dirige deformação e transformações comparadas ao
GLTFLoader/AnimationMixer em cinco seeks fora de ordem por clipe, erro <1e-6 nas
fixtures. Não há pose nativa montada manualmente por sampler fonte. O oráculo
resolve a malha filha quando Three retorna Bone; não assume que nó sempre é Mesh.
Warnings Khronos exatos, mixers/geometrias/materiais/esqueletos descartados.

## Evidência final

Onze testes: zero falhas, 634 asserts, 908 ms. Ampliação importação/pureza:
292 passes, zero falhas, 28 arquivos, 32.151 asserts, 8,51 s. Biome: 817 arquivos.
Primeiro typecheck encontrou duas incompatibilidades de tupla versus lista em
asserções novas; comparação passa por listas sem cast de domínio ou tolerância
numérica nova. Tipos passaram. Integral: 1.925 passes, zero falhas, 268 arquivos,
8.228.225 asserts, 103,27 s. Vite: 1,73 s. Kids: 9,7 s de compilação, 32,8 s de
tipos e 59 páginas em 1.114 ms. Diff check passou. Sem nova dependência nem
mudança do formato público; homologação visual/GPU/toque segue aberta.
