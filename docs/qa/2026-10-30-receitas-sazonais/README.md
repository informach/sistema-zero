# Receitas sazonais: prova local

Em 30/10/2026, sobre staging `6461f19c0` com alterações locais, sem publicação.

## O que foi executado

- `tests/receitas-sazonais.test.ts`: três testes e 33 asserções. Calendário em anos distintos,
  receita conhecida fora da época, preparo recusado, prato preservado ao migrar/reabrir,
  ingredientes intactos ao exceder 999 ou 65.536 bytes UTF-8.
- Receitas do Bento, receitas do anel, festas e os primeiros casos sazonais: 38 testes,
  1059 asserções, zero falhas. O caso de bytes foi acrescentado e executado depois.
- Tipagem do jogo e dos contratos passou. Biome passou nos arquivos do trecho.
- `playground/verificar-festa-browser.ts`: dois fluxos, 1280 e 390 pixels, Chrome/SwiftShader.
  Junina à noite, fogueira acesa e animada, pipoca preparada, Milho da fogueira preparado,
  ingredientes consumidos uma vez, pipoca comida, diversão conferida, aviso e descarregamento.
  `r1/resultado.json` e seis PNGs preservam a execução. O celular é emulado e usa a tecla E,
  como o verificador já fazia; isso não prova o gesto de toque em aparelho físico.

## Revisão

A primeira execução dos testes encontrou uma expectativa antiga com a lista inteira das
receitas, dentro do teste de amizade do Bento. Agora esse teste separa as receitas de festa
para avaliar somente a regra dos corações. As receitas sazonais têm testes próprios.

O preparo recebe a festa explicitamente, sem relógio oculto na regra pura. O painel consulta
novamente a época ao clicar. A bancada automática filtra as mesmas receitas disponíveis.
O Diário conserva o catálogo. As datas de Lanternas e fim de ano não foram ativadas.

## Limites ainda abertos

O caso de Carnaval também passou no navegador: `r2-carnaval` e `r3-carnaval`, em 1280 e 390 pixels,
com preparo na bancada, reabertura fora da época, prato preservado e novo preparo bloqueado.
O caso estreito usou o botão de toque Usar. Os quatro PNGs e o resultado estão nessa pasta.
Essas execuções usam `ARQUIPELAGO_CARNAVAL=1`, que roda só os dois fluxos novos. R3 usa
Junina explicitamente no retorno para não depender da data real em que o verificador rodar.

Não há prova de aparelho físico, ambiente hospedado, retorno anual com conta autenticada ou
revisão final de todos os lotes. O vestuário sazonal está em implementação e qualificação separadas.
