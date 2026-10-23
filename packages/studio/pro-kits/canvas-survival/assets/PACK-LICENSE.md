# Arena dos Guardiões — arte original

Os arquivos `player.png`, `seeker.png` e `drifter.png` foram desenhados por código
para o Sistema Zero em 2026. A fonte autoral reproduzível está em
`../scripts/generate-pack.ts`. Não usam imagens, fontes, sons ou recortes do P27
ou de outro pacote externo. Os personagens são formas originais: guardião de
jardim, caranguejo de folhas e lanterna flutuante.

Esta arte é oferecida sob **CC0 1.0 Universal**. Na extensão permitida pela lei,
o Sistema Zero renuncia aos direitos autorais e conexos sobre essas imagens.
É permitido copiar, alterar, remixar, redistribuir e publicar os jogos que as
utilizem, inclusive comercialmente, sem pedir autorização ou dar crédito.
Não há garantia. O nome e marcas do Sistema Zero não são cedidos pela licença.

Texto da dedicação: https://creativecommons.org/publicdomain/zero/1.0/legalcode

Crédito opcional: “Arte original do kit Arena dos Guardiões — Sistema Zero”.

As permissões desta arte não se estendem automaticamente aos desenhos que o
aluno importar. A procedência e os termos de cada material permanecem no projeto.

## Estrutura das folhas

Cada folha mede 640 × 64 pixels, com dez quadros de 64 × 64, em uma única linha.
`idle`: quadros 0–1, 4 FPS; `walk`: 2–5, 8 FPS; `hurt`: 6, sem loop;
`death`: 7–9, 10 FPS, sem loop. As caixas são frações do quadro conforme o
contrato do Pinta. O jogo usa corpos fixos por padrão; adotar essas caixas é
uma opção explícita no binding.

## Reproduzir e conferir

Na pasta `packages/studio/pro-kits/canvas-survival`:

    bun scripts/generate-pack.ts
    bun scripts/generate-pack.ts --check

O script gera PNGs determinísticos e um manifesto de autoria com SHA-256.
Esse manifesto é entrada do factory, não substitui o manifesto de materiais
que o Studio projeta para cada projeto.
