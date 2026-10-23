# Evidências da análise de usabilidade do Molda

14/10/2026. Observação local do playground; perfil `explorer`, Chromium headless pelo Playwright do projeto. Nenhuma sessão de produção foi usada.

Proposta: [documento completo](../../docs/plans/2026-10-14-molda-usabilidade-proposta.md).

## Revisão da proposta

A proposta principal contém a revisão 4, incluindo o retorno criar–pintar–animar–continuar criando. A [revisão crítica](../../docs/plans/2026-10-14-molda-usabilidade-revisao.md) registra 33 achados, cinco adicionais nesta rodada. O [catálogo de telas e fluxos](../../docs/plans/2026-10-14-molda-usabilidade-fluxos.md) define 45 telas/estados e 50 percursos. As propostas [v1](proposta-v1.md), [v2](proposta-v2.md) e [v3](proposta-v3.md), os catálogos [v2](fluxos-v2.md) e [v3](fluxos-v3.md) e as revisões críticas [v2](revisao-v2.md) e [v3](revisao-v3.md) são históricos; seus links relativos conservam o contexto da pasta original e não devem orientar a implementação.

As capturas abaixo continuam sendo da interface existente. A revisão 4 não foi implementada, capturada ou testada com crianças. A verificação documental é reproduzível com `node .audits/molda-usabilidade-2026-10-14/verificar-proposta.cjs`; o resultado fica em [verificacao-proposta.json](verificacao-proposta.json).

Nesta rodada foram relidos os documentos normativos, os contratos de inserção/duplicação, pintura por camada e rascunho de pose, além dos prints de Pintar e Animar. A análise acrescentou regras para pertencimento de peças novas, retorno entre atividades, navegação/duração/reprodução, Borracha, saída de Olhar e avaliação conjunta de grupo e filho. Não houve nova execução do editor.

## Capturas

- [Galeria](01-galeria.png)
- [Entrada do modelo](02-modelar-vazio.png): apesar do nome do arquivo, o fluxo real já cria uma caixa inicial. Não é uma cena sem peças.
- [Girar no palco e Mover no painel](02b-girar-e-painel-mover.png)
- [Após adicionar uma caixa](03-modelar-peca.png): a lista tem duas peças; a inserida está sobreposta à inicial.
- [Após adicionar outra caixa](04-duas-pecas.png): três peças na lista, mesma silhueta sobreposta. O nome do arquivo conta as duas adições feitas no roteiro.
- [Pintar](05-pintar.png)
- [Animar antes de criar movimento](06-animar-vazio.png)
- [Animar com movimento, 1366 × 768](07-animar-movimento.png)
- [Animar com movimento, 1024 × 600](08-animar-1024.png)

O aviso de oficina em desenvolvimento/sincronização no alto pertence ao ambiente local observado; não foi tomado como evidência do estado da produção. A inspeção usou o perfil básico; o host real acrescenta chrome, nuvem e eventualmente guia de tarefa.

## Roteiro e resultado

`capture.cjs` abre um contexto isolado, cria um projeto de demonstração, seleciona a peça, ativa Girar, adiciona duas caixas, abre Pintar, abre Animar, cria movimento e captura os estados. Aguarda o desaparecimento da mensagem de criação antes das capturas do editor. Os arquivos de texto registram conteúdo visível/DOM para auditoria; não são medidas de legibilidade.

Execução final concluída, sem erros de página registrados (`runtime-errors.json`). O roteiro não executou pintura, arrastos de transformação, gravação de poses, exportação, recarga, nuvem ou testes com crianças.

Medidas observadas após criar movimento:

- Janela 1366 × 768: canvas `x=96`, `y=224.1875`, largura `998`, altura `288`.
- Janela 1024 × 600: canvas `x=96`, `y=224.1875`, largura `656`, altura `288`.

Essas medidas não descontam controles flutuantes que ocupam o canvas. O espaço efetivamente desobstruído é menor.

Reprodução: iniciar o playground de `packages/molda` em `127.0.0.1:5216` e executar `node .audits/molda-usabilidade-2026-10-14/capture.cjs` na raiz. O script usa o Playwright instalado no pacote. As imagens são capturas do produto existente, não mockups da proposta.
