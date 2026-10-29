# Conferência do aconchego dos cômodos

Entrega fase1-15. Branch staging, playground com plataforma falsa, sem persistência e sem banco.

- `bun test`: 542 passaram, 1 ignorado por exigir Postgres, nenhuma falha.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run typecheck`: passou.
- `bun run build`: passou, 64 arquivos e 21,67 MB nesta execução.
- `bunx biome check packages/arquipelago --diagnostic-level=error`: passou, 257 arquivos.
- `bunx biome check .`: passou na conferência final da raiz. A primeira execução encontrou
  19 erros no estado compartilhado do repositório, resolvidos pelas atualizações concorrentes.
  Não foi aplicado formatador global nem correção em arquivos de outras tarefas.
- Revisão completa das regras, isolamento por cômodo e lote, origem dos objetos, recursos
  gráficos, gestos e textos. A seleção e o painel só existem na loja transitória do Construir.
  Nenhuma mudança de contrato, formato do salvamento, arte ou CI.

## Navegador

Chrome instalado no Windows, em modo sem janela. O Chromium Linux não existe neste computador.
O script aceita `ARQUIPELAGO_CHROMIUM` para outro executável. Subiu `bun run dev` em porta local
e abriu `?novo=1&persistir=0&obra=exemplo`. Execução no pacote:

```sh
bun build playground/verificar-aconchego-browser.ts --target=node --external playwright-core --outfile .cache/verificar-aconchego-browser.mjs
node .cache/verificar-aconchego-browser.mjs
```

Passou em 1280 × 800 e 390 × 844 com toque emulado:

- Abrir Construir, escolher Olhar e tocar no quarto pelo chão, com a câmera real.
- Trocar o cômodo pelo seletor, conferir cinco parcelas e dica. Sem transbordar a largura.
- Fechar o painel, arrastar a câmera e reabrir sem mudar a seleção.
- Abrir pelo teclado e voltar ao Viver. Nenhum erro de página.
- Em desktop, colocar janela redonda pela ferramenta real: o cômodo passou de 14 a 16 pontos.
  Desfazer voltou a 14. Trocar ladrilho por azulejo manteve 14; Desfazer também funcionou.
- Na revisão do teste, o primeiro clique de edição atingia a barra, que cobria a parede.
  O percurso passou a mover a câmera antes de editar, sem alterar as regras da construção.

Prints inspecionados: [computador](2026-10-28-aconchego-computador.png) e
[celular emulado](2026-10-28-aconchego-celular.png).

## Preparado para depois

Limites de visita e festa exportados, sem disparar eventos. Plantas dos cômodos novos aguardam
objeto de interior no catálogo e ligação na ferramenta. O pedido completo de arte está em
`docs/plans/2026-10-28-arquipelago-aconchego-arte.md`. Nenhuma regeneração de modelo é exigida
para o cálculo ou painel atual. Falta conferir toque, teclado virtual e legibilidade em celular
físico; emulação não mede desempenho real nem substitui essa conferência.
