# Lote 232 — homologação em navegador real da oficina integrada

Estado: implementado, revisado e verificado em Chromium real, 10/09/2026.
Fases 3 e 9. Este é o gate que os lotes 1 a 224 registraram como impossível: o browser
não conectava, e a suíte e2e nunca rodou desde então.

## O que se descobriu ao rodar

**A suíte e2e do editor ANTIGO estava vermelha, e ninguém sabia.** Duas provas
reprovavam desde o lote grande, por mudanças legítimas que ninguém pôde observar:

1. O seletor de "Enquadrar" virou ambíguo quando "Enquadrar seleção" entrou na mesma
   barra. Corrigido com `exact`.
2. O estado do atlas saiu de `viewport.atlasFull`/`viewport.layout` para o
   `ModelAtlasResource` extraído. A prova lia o lugar antigo e comparava contra
   `undefined`. Corrigida para o lugar novo; o comportamento nunca mudou.

Nenhuma das duas é regressão deste lote: são o preço de 224 lotes sem um navegador.

## O e2e da oficina nova, que não existia

`e2e/scene-workshop.spec.ts`, sobre `?oficina=app` (a capacidade ligada só no playground):

- **Criar pelo fluxo de sempre abre a oficina nova já promovida.** A prova não é a tela:
  são as chaves do IndexedDB. `molda:scene:` e `molda:scene-summary:` existem, o original
  ficou em `molda:scene-originals:`, a lápide `molda:record-deleted:` foi gravada e
  nenhum `molda:record:` sobreviveu. É o desenho de segurança inteiro, medido no disco.
- **A foto chega à galeria como imagem de verdade**, não como o cubo de reserva: a espera
  é pelo resumo no disco ganhar a miniatura, não por um relógio.
- **Recarregar mantém a criação na geração seguinte** e ela reabre na oficina, não no
  editor antigo.
- **Modelar e desfazer valem um passo cada**, com o palco 3D vivo. O caminho da criança
  inclui abrir o painel de formas, que nasce recolhido.
- **Tablet (768x1024) e celular (390x844)**: o palco mantém área de desenho, a saída
  continua alcançável e a página não ganha barra horizontal em nenhum dos dois.
- Todas as provas falham se a página emitir UM erro: `pageerror` é assertado como vazio.

## Provas

- **14 de 14 specs passam em Chromium real**, incluindo as duas que estavam quebradas e
  as três novas. É a primeira vez que a suíte inteira fica verde desde o lote grande.
- Sessão manual no navegador, além do e2e: criar, promover, modelar, animar, exportar GLB
  pelo worker real, escolher o destino da cópia, voltar para a galeria e recarregar, com
  o console sem um único erro.
- Tipos e Biome dos arquivos de e2e passaram.

## Limites

- Chromium apenas. Firefox e Safari não foram exercitados aqui.
- Emulação de tamanho não é toque de verdade, e nada disso mede GPU de tablet.
- Leitor de tela não foi exercitado; o que se prova é a árvore de acessibilidade que o
  Playwright usa para achar os controles pelo papel e pelo nome.
- Nenhuma criança usou nada disso. Usabilidade continua sendo gate humano.
