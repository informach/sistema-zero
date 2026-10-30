# História e relações dos moradores

**Objetivo:** tornar alcançáveis as páginas do Pico, Vale e Nuvens e completar as relações de Maré, Floco, Jade e Iriê, preservando suas ações atuais.
**Arquitetura:** regras puras comuns com dados de cada morador, estado no salvamento versionado e painel reutilizado. Sem segundo inventário, nova moeda ou alteração da arte.
**Tecnologias:** TypeScript, Zod, Zustand e React existentes.
**Referência:** programa de entrega integral, L02 e a parte de amizade de L06; proposta original, história e moradores.

## Decisões

- A abertura “O Cinza” chegou em `584b286a6`; revisar e qualificar sua integração, sem criar outra abertura.
- A proposta libera páginas pela amizade. Manter os dois corações da Capi/Bento também em Floco/Jade/Iriê, em vez de substituir a relação por completar uma corrida.
- Maré conserva a página do navio como descoberta. Sua amizade dá dicas e pedidos sem duplicar a página nem obrigar nova conquista.
- V17 acrescenta quatro registros de `MoradorSchema`, inicialmente vazios; V1–V16 permanecem históricos. Sem SQL novo: API já valida e migra o documento.
- Usar conversa 10, pedido 30, presente preferido 20/comum 8, teto 500 e um presente/pedido por dia. Pedidos usam itens já obtidos da horta, sem ingredientes inacessíveis ou arte nova.
- Aniversários são escolhas editoriais registradas: Maré 8/6 (mar), Floco 21/6 (inverno), Jade 18/5 (museu), Iriê 21/9 (árvores). Não são datas históricas dos personagens.
- Pico mantém a frase da proposta e seu complemento. Vale e Nuvens usam as frases originais
  dos cartões interativos do HTML: “Guardei tantos rascunhos que virou uma montanha.” e
  “Deixei a faísca para quem vier depois.”. Não substituir essas pistas por narrativas novas.
- Conciliação conserva amizade e itens na mesma transação; não somar snapshots de duas abas.
- O painel oferece conversa, pedido e presente com o tema atual, toque e foco. Íris conserva o painel de apresentação do final.
- Sem commit/push intermediário: fechamento somente após o programa completo e revisão final.

## Execução e aceite

- [x] V17, migração de todas as versões, esquema histórico intacto e capacidade UTF-8 abaixo de 65.536 bytes.
- [x] Regras de conversa/pedido/presente dos quatro, idempotência diária, aniversário e recusa sem itens.
- [x] Preservar planador do Floco e ovo da Jade, sem duplicação; registrar amizade no mesmo gesto.
- [x] Textos e páginas abertas a dois corações; dica honesta antes e entrega no cruzamento do limite.
- [x] Painel comum com ações reais e guardas de visita, leitura e conflito.
- [x] Testes da API para salvar/reabrir V17 e negar revisão atrasada; testes de migração, teto e conflitos.
- [x] Navegador desktop e celular: conversar, presentear, entregar, conferir diário e reabrir. Evidência em `docs/qa/2026-10-29-amizade/README.md`.
- [ ] Revisão da abertura recebida, documentação, tipagem e testes dos três pacotes.

O restante de L06 (visitas por aconchego) e os outros lotes continuam abertos; este plano não declara a entrega integral concluída.
