# Qualificação local da revisão de 31/10/2026 (item Q)

Playground do jogo com a plataforma falsa, sem banco nem conta real, Chromium local com
SwiftShader. Computador 1280 × 720 e celular emulado 390 × 844. Prova local: não é aceite no
ambiente publicado nem em aparelho físico (ficam com a dona).

## Lumis de luz saindo do baú e no álbum

`playground/verificar-segredos-dos-movimentos-browser.ts`, com a conferência nova do álbum depois
do baú da montaria (o Brotinho de Luz aparece na seção "Lumis de luz").

```text
computador: baú cipo aberto / patins / montaria
computador: o álbum mostra o Brotinho de Luz
computador: baú balao aberto
PASS computador
celular: (o mesmo)
PASS celular
```

Prints em `lumis-de-luz/`. Duas rodadas anteriores pararam no baú do balão: o teleporte direto do
Vale para a nuvem (14 m acima do chão das Nuvens) chegava antes de a ilha completa carregar o
colisor da nuvem, e a criança caía. O verificador agora leva a criança de novo até ela ficar no
lugar do baú. Não é defeito do jogo: a criança chega lá de balão, com a ilha já ativa.

## Roupas da festa concedidas na festa

`playground/verificar-roupas-browser.ts` ganhou o caso da Festa Junina (`?festa=junina`): as duas
roupas da `conquista` chegam ao avatar, com o recado da festa, e só elas (o chapéu da Jade já
tinha chegado). Para isso a plataforma falsa recebe a festa do ensaio (`festa` em
`criarPlataformaFalsa`), como o jogo já recebia por `definirFestaDoPlayground`; o serviço de
verdade segue olhando só a data.

```text
PASS computador: o chapéu da Jade chegou uma vez ao avatar
PASS computador: as roupas da Festa Junina chegaram ao avatar na festa
PASS celular: (os dois)
```

Prints em `roupas-da-festa/`. "Trancada fora da festa" (sem compra, "Da festa" na loja) está
provado nos testes do Members (`tests/integration/avatar.test.ts`, 409 `AVATAR_PART_FESTA`, e a
conformidade com o contrato); a loja do avatar dentro das comunidades exige a pilha autenticada e
fica para o aceite da dona.

## Já provado nos lotes

- Percurso completo do Farol até a última página: `verificar-final-farol-browser.ts` (N4).
- Móveis no andar de cima: `verificar-andar-e-terreno-browser.ts` (C3), prints em `andar-moveis/`.
- Resposta perdida da obra (N1): `tests/obra-estendida.test.ts`, com a plataforma falsa.

Fluxo autenticado nas duas comunidades: não subi a pilha local completa; fica com a dona.
