# Regressão da cena com as paletas de perfil

## Objetivo

Atualizar a proteção da experiência interativa das aulas para o modelo atual de seis
paletas de perfil. A troca feita em **Meu perfil** deve continuar chegando ao atributo
`data-sz-palette` do documento, e as cenas que derivam o papel de `--primary` devem
permanecer legíveis em cada cor.

## Decisão

A fonte dos ids e das cores não será duplicada no teste:

- `PALETTES` e `DEFAULT_PALETTE` vêm de `@sistemazero/core/palette`.
- A ação efetiva de cada paleta vem de `derive(id).action`, em
  `@sistemazero/ui/tokens`.
- O fallback literal de `scene.css` permanece como caso adicional, pois protege uma
  cena renderizada fora de um host que ainda não tenha emitido o tema.

Assim, uma nova paleta não poderá ser adicionada ao vocabulário sem entrar nos cálculos
de contraste da cena.

## Lote 1: matriz de contraste

1. Trocar a lista manual de Padrão, Pink, adulto e Admin em
   `packages/member-shell/tests/scene-contrast.test.ts` por uma matriz derivada das
   seis paletas canônicas, mais o fallback explícito.
2. Tornar as contagens esperadas derivadas do tamanho dessa matriz.
3. Verificar que cada paleta não padrão altera o cálculo do papel da cena e manter a
   régua visual forte entre Azul e Rosa, sem relaxar os limites AA atuais. Paletas
   vizinhas não precisam produzir fundos artificialmente distantes quando a mistura
   usa só 5% de cor.
4. Manter a leitura das receitas diretamente de `scene.css`: o teste deve continuar
   medir o CSS publicado, não uma cópia da intenção.

## Lote 2: ponte do seletor até a cena

1. Atualizar a cobertura já existente do componente no ambiente real de happy-dom da
   Comunidade Kids, sem substituir seus cenários de reconciliação, falha e clique.
2. Confirmar que a fileira de radios nativos tem a mesma ordem e os mesmos ids do
   catálogo compartilhado. Os cenários existentes já verificam a troca imediata de
   `data-sz-palette` e a persistência do PUT no BFF.
4. Conferir a ponte semântica de `scene.css`: a cena usa `--primary`, e os dois hosts
   de aluno conectam `--primary` à ação derivada da paleta.

## Verificação

- Executar o teste novo/verificado em `@sistemazero/member-shell` e
  `@sistemazero/community-kids`.
- Executar typecheck e Biome nos pacotes envolvidos.
- Rodar os testes de geração/contraste do `@sistemazero/ui`, que já verificam que os
  seletores CSS gerados cobrem todos os ids do registro.
- Revisar o diff para garantir que apenas os arquivos deste lote foram incluídos;
  alterações locais de voz permanecem fora dele.
