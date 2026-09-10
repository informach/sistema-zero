# Ajuste de dois ossos: base geométrica, lote 127

## Contrato e prova

`solveTwoBoneReach` recebe raiz, articulação, ponta, alvo e indicação opcional de
dobra, todos no mesmo referencial euclidiano. Retorna pontos próprios e estados
`reached`, `too-far` ou `too-close`, além da origem da direção/dobra. Não recebe
documento, Three, stores, hierarquia, pesos ou animação; não escreve nem retém input.

Para comprimentos positivos a/b e distância d da raiz ao alvo, a ponta é alcançável
exatamente quando |a-b| ≤ d ≤ a+b. Fora disso, usa a fronteira mais próxima na
direção do alvo e informa a limitação, sem esticar segmentos. No plano da dobra,
a posição intermediária tem coordenada axial x = (d + (a-b)(a+b)/d)/2 e altura
y = sqrt((a-x)(a+x)). As duas distâncias então são a e b. Quando d=0 e a=b,
x=0 e y=a. Essa construção não precisa de iteração ou cache.

O cálculo usa unidades do maior comprimento para não elevar grandezas extremas
ao quadrado. Uma altura quadrada ligeiramente negativa só é tratada como zero
dentro de 1024 eps; depois a reconstrução precisa conservar cada comprimento
com erro relativo ≤1024 eps. Falha de representabilidade recusa o resultado.
Isso inclui translações enormes que apagam a precisão necessária para uma dobra;
não mover/recentrar/clamp a criação como contorno dessa impossibilidade.

Direção perpendicular vem da indicação, depois da articulação original, depois
do eixo cartesiano menos alinhado, com empate X/Y/Z. Quase paralelismo até 64 eps
é ambiguidade numérica reportada pela origem escolhida, não um dado persistido.
Alvo coincidente usa a direção da pose. Alvo já igual à ponta sem nova indicação
devolve cópias exatas dos pontos originais, sem deriva.

## Verificação focal

24 testes/2 arquivos, zero falhas, 2.125 expectativas, 794 ms. Seis testes do solver
cobrem 128 transformações rígidas/refletidas uniformes com oráculo Three separado,
192 combinações de comprimentos/alcance, extremos 1e-150 a 1e150, limites interno/
externo, dobra fechada, pose sem mudança, indicação degenerada, ownership e recusas.
Contrato de pureza verifica ausência de React/Three/stores no código de produção.
Tipos passaram. Integral: **1.563 testes, zero falhas, 231 arquivos, 96,86 s**.
Biome/695 arquivos e Vite/950 ms passaram. Kids: compilação/5,3 s, tipos/9,8 s,
59 páginas/457 ms, exit 0. Diff check passou; aviso de chunk Three permanece.

## Limites da entrega

É base geométrica, não um controle de IK utilizável na oficina. Ainda faltam a
conversão segura para rotações locais da timeline, revisões/cancelamento/undo, UI,
limites de juntas e bake. Uma transformação afim não uniforme muda a métrica;
esta solução não justifica decompor shear, alterar escala ou igualar distância
em mundo a distância local. O adaptador deve provar a representação ou recusar.

Referência de capacidade, não de código/algoritmo copiado:
[Unity, Two Bone IK](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.2/manual/constraints/TwoBoneIKConstraint.html).
