# Integração do remoto com o Pinta

Fonte integrada `16b73341881625fa46406594710dfea1e8f12996`, que conserva o remoto
`2932075e49907e0fac07eb1ca2471f219b84dee5` e as entregas locais de autoria do Pinta.
Esta correção usa exclusivamente a autorização de QA/CI: nenhuma implementação,
arte ou funcionalidade de Molda/3D foi modificada.

## Medição do teste de tamanho

O remoto acrescentou a integração de cenários ao Jogo 3D Avançado. O teste existente
recusou 220.689 caracteres contra o teto de 210.700. A medição independente no
[GitHub Actions 44600643248](https://github.com/informach/sistema-zero/actions/runs/44600643248)
comparou `81dfb3d8d` e `2932075e4`, ambos com Bun 1.3.11 e instalação congelada em
Ubuntu 24. O texto tem SHA-256 idêntico à medição Windows:
`0e4887f24178b829c7c90aa064322e53d41d483185123767084b7433061807b7`.

| Medida do Avançado | Antes, Linux | Depois, Linux | Depois, Windows |
| --- | ---: | ---: | ---: |
| Caracteres | 210.610 | 220.689 | 220.689 |
| Gzip, bytes | 59.734 | 62.564 | 64.974 |

Os tetos foram ajustados somente nesse caso para 220.700 caracteres, 62.600 bytes
gzip Linux e 65.000 Windows. Os três outros runtimes conservaram exatamente seus
textos e tetos. Recibos: [antes](medidas-linux-antes.json),
[depois](medidas-linux-depois.json), [Windows](medidas-windows.json).

## Verificação e limites

- A [execução anterior](integracao-red.txt) teve 17 aprovados e uma falha no teto.
- A [execução após a correção](integracao-green.txt) teve 18 aprovados, zero falhas
  e 79 asserções, incluindo geração de jogo Pinta e atualização de artes.
- O TypeScript completo do Estúdio saiu com código zero após esse merge,
  antes da alteração exclusivamente numérica do teste: [log](studio-types.txt).
- Três JSONs de evidências remotas foram formatados pelo Biome. Os valores JSON
  são preservados; a mudança resolve os três erros de formatação do gate global.
- O diff de `cc1a416ae` até o merge em `packages/studio-runtime` e
  `packages/core/src/studio` permaneceu vazio. A imagem Linux qualificada com
  perfil `8151d121…` continua correspondendo a essa fonte de runtime.

Isso não comprova implantação, publicação autenticada ou conclusão da missão.

O Biome global final verificou 16.303 arquivos com código zero: [log](biome.txt).
Uma comparação estrutural com os três JSONs de HEAD confirmou igualdade dos valores.
