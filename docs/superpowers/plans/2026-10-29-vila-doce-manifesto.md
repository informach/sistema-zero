# Manifesto da corrida do entregador

**Objetivo:** entregar o quadro da Vila Doce e três desafios do dia como projetos JavaScript em blocos, seguindo o Bosque.
**Especificação:** tarefa fase2-11, `docs/arquipelago-manifesto-de-desafios.md` e parte 3 de `docs/plans/2026-10-28-arquipelago-desafio-do-dia-e-manifestos.md`.
**Arquitetura:** fontes e arte embutida em `docs/desafios-do-jogo/vila-doce/`; gerador valida o schema antes de escrever o JSON. O principal deixa por completar largada, movimento, contato e contagem do tempo. As variações reutilizam a corrida e mudam uma regra: duas entregas, prazo menor ou caixa nova. Enter para recomeçar é o extra de cada desafio, sem impedir recomeçar pelo botão.
**Tecnologias:** IR v2, Blockly, extensão Jogo 2D e executor real do studio-runtime.

## Restrições

- Somente blocos presentes nas listas locais de Faísca, Construtor e Inventor, sem liberações manuais.
- HTML e CSS vazios no IR; nenhum bloco de Canvas ou JavaScript direto.
- Principal no quadro 6, moedas 20 e 10; diários sem quadro e sem cor, moedas 10 e 5, como o Bosque.
- Arte SVG embutida, sem rede. Projeto aprovado entrega a atração da corrida pelo caminho existente.
- Não alterar o salvamento, o cliente do Arquipélago, ambientes, CI ou bancos remotos.
- Textos para a criança sem travessão ou exclamação.

## Entrega e validação

- [x] Criar `projetos.ts`, `objetivos.ts`, `gerar-manifesto.ts`, README e JSON gerado na pasta da Vila.
- [x] Validar schema, paleta até Inventor, tetos e coerência entre fontes e JSON em `manifesto-da-vila-doce.test.ts` e `vila-doce.test.ts`.
- [x] Abrir os oito projetos no Blockly e comparar o código regenerado.
- [x] Executar gabaritos, iniciais e mutações incorretas no executor real. Cada objetivo obrigatório deve passar no gabarito e falhar no inicial.
- [x] Conferir importação HTTP em memória, sem banco remoto, se o cenário acrescentar cobertura ao teste existente.
- [x] Rever o diff completo, rodar testes, TypeScript e Biome, registrar resultados e enviar ao staging.
