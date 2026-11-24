# Integração da staging — 22/11/2026

Entrada `69ced6cb3ed9ae3ac2a4b09db68361cb20068b5a` sobre
`68121986166388d42b0f931296644862631bad29`, na branch isolada da missão.
Merge sem conflitos. Os 16 blobs recebidos são idênticos ao remoto; o recibo
`index.json` registra os IDs Git do índice e da origem. Nenhuma fonte Pinta,
Core ou Molda foi alterada pela integração.

## Revisão

- A carga antiga do Blockly só regenera o programa se ainda corresponder ao
  estado vigente. Isso conserva o código recuperado e digitado na Ponte.
- A janela de projeto repõe o idioma inicial na abertura, sem apagar o texto
  quando o componente pai renderiza outra vez.
- Esconder a página confirma o rascunho durável no IndexedDB, inclusive quando
  o journal síncrono não comporta o projeto. Sair da página conserva a exigência
  de recuperação síncrona e os avisos de erro; rascunho não vira ACK da nuvem.

Essas mudanças são relevantes para conservar a programação e os arquivos ao
atualizar artes do Pinta. Não encerram a investigação histórica de divergência
de IR nem o ciclo final autenticado da Vila e Floresta.

## Verificações locais desta integração

- 89 testes do Estúdio, 348 asserções, três arquivos: persistência, recuperação
  síncrona e janela de projeto; zero falhas.
- 12 percursos Pinta → Estúdio e quatro percursos de carga antiga/recarga/aba
  oculta no Chromium desktop, sem retry. Incluem JavaScript, Python, atualização
  de mapas/peças, portas, preservação do programa e rollback de escrita.
- Tipos completos do Pinta e Estúdio; lint dos 11 arquivos TypeScript recebidos
  e whitespace aprovados. O build de produção para os ensaios também terminou.
- A suíte completa de 2.713 testes do Pinta pertence ao commit pai `681219861`:
  as fontes Pinta/Core são idênticas. Ela não foi repetida nem atribuída a esta
  execução; as novas fronteiras foram verificadas pelos testes acima.

Os testes de recarga usam arquivos de demonstração 3D como fixtures do Estúdio;
não alteram o editor ou as fontes do Molda. Avisos de tamanho de bundles e imports
dinâmicos ineficazes permanecem no log de build. Não houve implantação, teste
autenticado, novo ensaio externo ou teste em outro aparelho físico neste lote.
CPU/toque não foram emulados nesta matriz. Os contratos públicos continuam
nativo 7, físico 2, cena 3/PNG 4 e nuvem 6. A missão e a promoção regional seguem
em andamento; não é merge da feature para staging.
