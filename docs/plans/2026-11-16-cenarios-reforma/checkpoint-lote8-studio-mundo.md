# Lote 8.4 — Cenários no Mundo 3D

19/11/2026. Continuação do transporte de `d8add3ca9`. Este recorte integra o cenário importado ao **Mundo 3D**. **Não fecha 8.4**, nem aprova a composição artística da Faísca: Canvas 3D, Jogo 3D, Jogo 3D Avançado e consumo direto por projetos Pro autorais ainda têm seus recortes próprios.

## Implementação

- O bloco **Usar o cenário** usa o seletor existente de materiais, com uma categoria de cenário. A criança vê o nome, mas Blockly/IR/código guardam o ID estável. Renomear o asset conserva o vínculo. O bloco fica no início e faz ida e volta com `SZWorld3D.loadScene(id)`.
- O motor espera o carregador compartilhado antes de iniciar seu renderer/controlador. A cena completa substitui a base procedural de terreno, água e ambiente; não há segundo renderer nem sobreposição de dois terrenos. Falha no preparo mantém a cena anterior. Troca concorrente/cancelamento e descarte não instalam resultados atrasados.
- O chão vem dos campos físicos e das colisões canônicas. Recortes continuam vazios; o personagem cai por gravidade. Superfícies reais das pontes e contatos da cápsula dão apoio aos pés, inclusive nas juntas. Deslocamentos horizontal e vertical consultam os triângulos; o salto encontra o teto físico. Câmera, personagens, carrinho, teclado e ações de toque continuam no motor existente.
- As coordenadas da cena não são limitadas pelo antigo mundo centralizado. O posicionamento explícito continua valendo. Para a chegada padrão, foi extraída a seleção de início do explorador portátil para `resolverInicioDaCena`, compartilhada pelo exemplo e SDK. Um objeto decorativo remoto não pode fazer o centro combinado virar o único ponto de chegada fora do terreno. O autor continua responsável por indicar uma entrada apropriada em cenas cujo centro não tenha piso.
- O motor consulta o nível local de cada água; o resgate/arrasto de cenas importadas usa essa informação e o último ponto seco, sem misturar a reposição do mundo antigo. A cena conserva sua iluminação autorada; blocos de morros, água, grama e atmosfera procedural não substituem essa base enquanto ela estiver importada. Não foi alterada a velocidade padrão dos jogos.

## Correções encontradas na revisão

O primeiro ensaio de apoio revelou que medir somente o centro dos pés podia colocar o avatar sob uma junta da ponte. Foram acrescentados casos com junta sobre terreno inferior, junta sobre recorte e apoio pequeno entre as amostras. A correção utiliza a área dos pés e o contato real da cápsula, sem acrescentar um plano invisível ao tabuleiro.

Um teste novo reproduziu o salto atravessando um teto; a verificação vertical agora ocorre no mesmo quadro, com subdivisão do deslocamento. O comportamento dos jogos sem cena importada permanece coberto pela regressão existente.

O ensaio WebGL também encontrou uma ordem incorreta no encerramento: `renderer.dispose()` apagava o registro que o Three precisava para desalocar texturas posteriormente. Recursos, animadores e render targets agora saem antes do renderer e da liberação do contexto. O contador real volta a zero, sem alterar sombras ou zerar contadores no teste.

## Evidência de navegador

`preparar-mundo.ts` usa o projeto produzido pela galeria, passa seu JSON pela reabertura canônica e confere os mesmos assets. Em seguida monta preview e site pelo renderer/exportador oficiais. `verificar-mundo.mjs` usa Chrome/WebGL reais, entrada de teclado e o SDK gerado, sem mudar a física do teste.

| Caso | Prova |
|---|---|
| Cena completa no preview | Três trocas, caminhada, corrida, salto e curva sobre parte da ponte |
| Recorte sintético no preview | Três trocas e queda física pelo recorte, sem piso invisível nem teletransporte ao fundo |
| Site exportado | Três trocas e os mesmos movimentos, executando os arquivos do export |
| Player público local | Mesmo componente `PublicPlayer` e `StudioProjectPlayer` da rota `/jogar`, três trocas e os mesmos movimentos |

Nos três casos com a cena completa, as **441 consultas de altura/recorte** coincidem com a referência Raylib nativa em 1e-6 m. Consultas de terreno não são usadas como substituto da prova de apoio sobre a ponte. O percurso de navegador começa sobre o tabuleiro e é parcial: não certifica as cabeceiras nem a travessia completa de toda a ponte ou da Faísca. A cena técnica da galeria não substitui a composição final, que ainda precisa resolver seus acessos e implantação artística.

Cada cena completa mantém **30 geometrias/39 texturas** nos três ciclos; o recorte sintético mantém **10/14**. Cenas substituídas perdem filhos, árvore física e vínculo com o mundo. O encerramento retorna **0 geometrias/0 texturas** em todos os casos. São contadores de recursos do renderer, não uma medição do heap inteiro.

Não houve erro de script/CSP nem fetch/XHR dos materiais da cena. No player público, a única requisição de dados esperada é a publicação local controlada. O importmap usa Three/addons reais instalados, servidos nas URLs já pinadas para controlar a disponibilidade do CDN. O preview mantém origem opaca e CSP strict. Somente o contexto do site exportado bloqueia service workers; a atualização offline do PWA não é validada por esta prova.

O host local usa os componentes e CSS da comunidade, com os fallbacks de fonte quando não executa Next/font. A API de publicação é controlada pelo ensaio, sem publicar em conta real. Isso não substitui a validação Next/gateway/conta e implantação de staging prevista para o encerramento global. Não houve teste em aparelho físico, aceite perceptivo de IK ou aprovação artística.

Evidências em `evidencias/lote8-studio-mundo`: capturas de preview/export/player, vídeo de movimento, vídeo do recorte e recibo sem bytes privados. GLBs, projetos e cópias de sites com arte permanecem somente em `output/`.

## Qualificação

- Regressão Mundo 3D/seletor/carregador/documento: **397 testes, 17.584 asserções, 17 arquivos**, sem falha.
- Regressão de assets, importação, transporte, export e conversão Pro: **88 testes, 438 asserções, oito arquivos**, sem falha.
- Motor canônico: **22 testes, 150 asserções**, cobrindo chegada, runtime, água e movimento; tipagem do motor aprovada.
- Exportador portátil: **dois testes, 22 asserções**, incluindo reabertura do ZIP e conferência dos bytes/digest do runtime regenerado.
- Tipagem integral do Estúdio aprovada, incluindo o host local; Biome e `git diff --check` aprovados. A primeira passagem da tipagem identificou parâmetros sem anotação no middleware do ensaio; foram corrigidos e a execução integral seguinte terminou sem diagnóstico.
- Build/orçamento: limites originais mantidos. Carga inicial **365.070 bytes/118.273 gzip**, dois arquivos; Blocos **4.731.810/1.267.550**, Ponte **4.210.795/1.130.928**, Código **2.648.373/742.601**.
- O SDK inclui a função de chegada compartilhada: **500.821 caracteres**, três imports externos e SHA-256 `0ce2592c028fb1179183cf98aea41f3812b0f6219239bd9f22b7c63098cade4b`. O runtime portátil também foi regenerado pela extração da chegada: **1.106.298 caracteres**, SHA-256 `830824068cb5e5424915188e064c6fa13575d74d03a61dfa36c37c1507a66732`. Não se aplica a este novo recorte a identidade byte a byte registrada no checkpoint anterior.

Revisão do recorte concluída sobre os contratos de bloco/ID, entrada do SDK, preparo/troca/cancelamento, coordenadas, suporte/queda/teto, preservação do caminho sem cena e propriedade/descarte dos recursos. A repetição final do navegador aguarda o retorno à altura do piso antes de registrar o pouso. Não fica uma falha conhecida de código deste recorte escondida por alteração de orçamento ou por aprovação parcial da direção de arte. A falha preexistente de tamanho de documento Pinta continua registrada no checkpoint de transporte, sem aumentar limites para escondê-la.

## Continuidade

Depois de fechar este recorte, seguir para Canvas 3D, sem iniciar simultaneamente outro motor. 8.5/8.6, lotes 9–10, composição final da Faísca por meio da ferramenta, full review global, CI e implantação/validação de staging continuam pendentes.
