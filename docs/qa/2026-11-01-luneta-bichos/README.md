# Luneta: o bicho correndo e o segredo brilhando (01/11/2026)

Lacunas L11c. A proposta pede, pela luneta do píer, o morador acenando, um bicho correndo e um segredo
brilhando. Antes o bicho era um vulto cinza e o segredo um octaedro, iguais em toda ilha.

- **Bicho de cada ilha** (`BICHO_DA_LUNETA`, `sistemas/luneta.ts`): o coelho no Bosque, a ovelhinha de
  algodão-doce na Vila (arte nova, `arte/bichos/vila.py`, `ovelhinha-render.png`), a tartaruguinha no
  Recife, o pinguim deslizando no Pico, o triceratops filhote no Vale e o pássaro das Nuvens voando. Ele
  corre na frente do morador, virado para onde vai; com menos movimento fica parado olhando para a
  luneta (`luneta-posto-2-parado.png`, celular).
- **Segredo** (`SEGREDO_DA_LUNETA`): o Lumi de luz da família da ilha (B12), aceso também de dia, com
  um halo que pulsa.

Prints de `packages/arquipelago/playground/verificar-luneta-browser.ts` (postos 1 a 6 e 8; agora o
roteiro anda até a luneta ser o interativo mais perto, porque a partir do Recife o barco fica no píer e
o "Embarcar" vinha antes). Todos com `PASS`. As ilhas aparecem cinza: o jogo novo ainda não deu cor.
