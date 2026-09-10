# Lote 236 — o peso da primeira tela e o aviso do chunk Three

Estado: medido, corrigido e verificado, 10/09/2026. Fase 2.

## Uma regressão que eu mesmo introduzi, e a medição achou

O lote 228 importou `SceneWorkshopHost` estaticamente no `MoldaApp`. Isso arrastou a
oficina inteira, 159 componentes, para o bundle inicial: o pacote de entrada saltou de
**364 kB para 568 kB**, e a criança passava a baixar a oficina só para ver a galeria.

Carregada sob demanda, com `Suspense` e a mesma mensagem de "abrindo" do host interno, a
oficina só chega quando uma criação abre.

| Momento | Bundle de entrada |
| --- | --- |
| Antes da integração (lote 227) | 364 kB |
| Com o import estático (lotes 228 a 235) | 568 kB |
| Com o carregamento sob demanda | **351,55 kB** (gzip 113,57 kB) |

Ficou menor do que antes da integração, porque parte do que era do índice virou pedaço
da oficina.

## O aviso do chunk Three, aberto desde o lote 1

O `three.module` são 579,29 kB (gzip 146,74 kB) e passa do aviso de 500 kB do Vite.
Medido antes de tentar dividir:

- O `index.html` **não** precarrega o Three. Ele não está entre os 13 `modulepreload` da
  primeira carga: chega só quando uma superfície 3D abre.
- Os addons já são pedaços próprios (o `GLTFLoader` são 44,28 kB à parte).
- O que sobra é o módulo do Three em si, com o que o Molda realmente usa depois do
  tree-shaking. Não há como dividir um módulo único sem deixar de usar o renderer.

Então o aviso continua, e **o teto não foi aumentado**: ele é um sinal verdadeiro sobre um
pedaço grande, e o que ele deveria proteger, a primeira tela da criança, já está protegido.
Esconder o aviso subindo o limite tiraria o sinal sem mudar o byte.

## Provas

- Build do Vite antes e depois, com os números acima; `modulepreload` conferido no HTML.
- Integral **2.836/0**, 381 arquivos, zero avisos act; **14/14 e2e em Chromium real** com a
  oficina abrindo sob demanda; tipos do Molda e do Kids, Biome e build do Kids passaram.

## Limites

- Isto mede bytes de bundle, não tempo de carga em rede real nem em aparelho fraco.
- O `index` de 351 kB continua sendo o maior pedaço da primeira tela; reduzi-lo é outro
  assunto, e não foi tentado aqui.
