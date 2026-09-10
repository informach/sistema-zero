# Hierarquia e seleção GLB/glTF, lote 143

## Escopo

Leitura pura dos nós, transformações locais, cenas e referências. Saída própria,
sem geometria, buffers, IO, Three ou UI. Não substitui revisão de extensões,
conversão de materiais, skin, animação ou montagem final do documento.

Pais únicos e filhos sem repetição; passagem por raízes detecta ciclos também
em componentes desconectados. Nada usa recursão: cada nó/aresta é visitado uma
vez. Ordem de filhos e raízes das cenas é preservada; raízes compartilhadas por
cenas distintas são válidas. Cenas vazias diferem de bibliotecas sem cenas.
`selectGltfScene` exige índice explícito; null serve apenas para biblioteca sem
cenas. Não fundir cenas nem escolher arbitrariamente uma quando falta o default.

TRS/matriz não podem coexistir. Dados finitos e próprios; quaternion XYZW dentro
de [-1, 1] com norma aceita a 1e-6, sem normalização. Matriz local exige última
linha afim e colunas não nulas ortogonais a 1e-6; escalonar cada coluna antes do
teste evita overflow/underflow global. Tolerância aceita arredondamento numérico,
não autoriza reescrever a matriz. Reflexões, eixos nulos e colapso total continuam
exatos; nenhuma decomposição divide por escala zero. Zero assinado segue o único
zero do domínio autoral. Transformações globais e sua representabilidade serão
conferidas na montagem da cena nativa, não em cada nó isolado deste leitor.

Mesh/skin/câmera são índices válidos; skin e pesos exigem mesh. Todas as primitives
de um mesh instanciado com skin precisam de JOINTS_0/WEIGHTS_0. Essa checagem ocorre
uma vez por mesh na leitura atual; nova chamada confere dados novamente. Pesos
de nó têm cardinalidade dos targets e são próprios; ausência herda defaults.
Juntas pertencentes à cena, inverse binds e canais animados ainda são trabalho
dos leitores/conversores semânticos seguintes.

## Orçamentos e review

65.536 nós de entrada, 1.024 cenas, 65.536 referências agregadas de raízes. A
seleção editável aceita no máximo 512 nós, antes de copiar geometria/materializar
documento. Cena vazia pequena pode ser escolhida mesmo que outra seja grande.
Skin-check instrumentado: dois acessos ao mapa em 1.000 instâncias de uma malha,
sem cache entre chamadas. Não é benchmark de tempo/dispositivo.

Review conferiu cenas compartilhadas, referências e campos opcionais inválidos,
ordem arbitrária, ciclos antes de ler transformações, singularidades, valores
Double extremos, Float32 não normalizado, fonte intacta e descarte dos recursos
de teste do Three. Fixture inicial de matriz singular comparava zero assinado
como diferença; teste agora exige igualdade numérica exata em cada componente,
inclusive nos valores não zero, sem ampliar tolerância de matrizes autoradas.

## Evidência

13 testes de domínio e um de pureza adicionados. Importadores + pureza: 119 testes,
zero falhas, dez arquivos, 2.206 expectativas, 2,43 s. GLBs reais exportados com
helpers afins/reflexões/animação/skin são lidos pelo pipeline e suas matrizes
globais comparadas ao GLTFLoader, tolerância relativa 1e-12. Teste de matriz
comum passa pelo validador Khronos; singularidades têm verificação algébrica
independente da decomposição de um loader. Tipos corrigiram tuplas de fixtures e
lista vazia de segmentos do container, sem mudança de runtime. Tipos e Biome/745
passaram. Integral: 1.742 testes, zero falhas, 248 arquivos, 95,33 s e 8.198.192
expectativas. Vite/1,28 s e Kids: compilação/6,5 s, tipos/9,1 s, 59 páginas/657 ms
passaram. Diff check passou. Sem UI/importação pública ou homologação de hardware.

Base: [glTF 2.0, §§3.5 e 5.25](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
