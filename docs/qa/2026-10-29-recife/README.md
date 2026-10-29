# Recife e Maré, fase3-01

Conferência local em 29/10/2026, depois de receber o modelo `recife.glb` do commit `02cfe22f4`.
O playground usa dados locais. Nenhum banco de staging ou produção foi escrito.

## Resultado

- Recife completo carregado pela ponte, usando os 71 colisores do modelo.
- Cais sustentando o corpo em cinco pontos, do início à ponta, pelo lado livre do caixote.
- Entrada na caverna pela boca, nadando, sem correnteza impedir a passagem.
- Lagoa sustentando a cintura na superfície, com o corpo sem apoio no fundo.
- Maré com modelo animado, cilindro só para o corpo e apresentação em duas falas. A conversa
  abriu por E no computador e por Usar no celular, avançou e fechou pelo botão Tchau, Maré.
- Sair do Recife libera a ilha. Voltar carrega novamente e permite nadar na lagoa.
- Nenhum erro de JavaScript capturado na execução final do roteiro.

Chrome em modo headless com SwiftShader, telas de 1280 × 720 e 390 × 844. O celular foi
emulado, não é medição de desempenho ou validação de toque em aparelho físico.

## Comandos

No pacote `packages/arquipelago`:

```sh
bun test
bun run typecheck
bun build playground/verificar-recife-browser.ts --target=node --external playwright-core --outfile .cache/verificar-recife-browser.mjs
node .cache/verificar-recife-browser.mjs
```

Na raiz:

```sh
bun run lint
```

- Testes: 767 passaram, 1 pulado, nenhuma falha. O teste pulado requer Postgres local descartável.
  Inclui a lagoa nova, as faces coplanares, os colisores, a Maré e a liberação do GLB.
- A primeira execução concorrente com o navegador teve dois estouros de 5 segundos em testes
  antigos do Bosque e da Vila. A repetição completa, sem o navegador concorrente, passou em 24,51 s.
- Lint da raiz: terminou com código 0, sem erros; avisos e informações existentes no repositório.
- Typecheck: código 0. Biome nos 13 arquivos de código desta tarefa: sem ajustes ou diagnósticos.
- O roteiro final do navegador terminou com código 0 nos dois tamanhos, incluindo sair e voltar.

## Prints

| Cena | Computador | Celular emulado |
| --- | --- | --- |
| Chegada | [Ver](recife-computador-chegada.png) | [Ver](recife-celular-chegada.png) |
| Cais | [Ver](recife-computador-cais.png) | [Ver](recife-celular-cais.png) |
| Caverna | [Ver](recife-computador-caverna.png) | [Ver](recife-celular-caverna.png) |
| Maré | [Ver](recife-computador-mare.png) | [Ver](recife-celular-mare.png) |
| Lagoa | [Ver](recife-computador-lagoa.png) | [Ver](recife-celular-lagoa.png) |

## Achado que depende da outra sessão

A câmera fica muito próxima do avatar ao passar sob o teto baixo da caverna. O teste comprova
a passagem pela boca, mas o print registra a limitação de visibilidade. Não foram retiradas
colisões nem alterado `src/personagem/camera.tsx`, reservado expressamente à outra sessão.
O ajuste do enquadramento e a validação em celular físico continuam pendentes. A lagoa não tem
pendência de Blender; nenhum GLB foi regenerado nesta tarefa.

## Nota para a página de andamento

A página não foi alterada, pois esta sessão não tem acesso. Texto para fase3-01:
“Recife completo ligado, com lagoa para nadar, cais, Quadro das Cores e apresentação da Maré.
Conferido no computador e no celular emulado. Falta ajustar a câmera sob o teto da caverna e
conferir em celular físico.”

Texto para a parte do Recife de aj-ligar-10:
“A caverna fora da ilha leve entra na espera pelo modelo e na área segura de nado.
A passagem pela boca foi conferida. As plataformas das Nuvens ficam para outra fase.”
