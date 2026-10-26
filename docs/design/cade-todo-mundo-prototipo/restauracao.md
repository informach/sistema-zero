# Recuperar a proposta pedagógica sem perder a identidade da plataforma

Pedido aprovado: conservar todas as ideias e funcionalidades da primeira proposta, partindo dos componentes reais. Este trabalho altera somente o protótipo local.

O aluno precisa enxergar acontecimentos, escolhas, reações, valores e operações; não apenas ler uma descrição. O jardim, os esconderijos, o toque, a busca, o placar e o Zappy continuam sendo o vocabulário visual. Nunito e Baloo 2, molduras arredondadas, botões com relevo e espaçamento em múltiplos de 4 px vêm da plataforma. Azul marca o acontecimento; âmbar, o escolhido; verde, a reação e a confirmação; rosa, o valor guardado. As cores usam os tokens existentes, acompanhadas de rótulos e ícones.

## Plano de execução

- [x] Toque: recuperar instruções progressivas, diagrama acontecimento → escolhido → reação com ligação desligada/ligada, teste em outro esconderijo e resumo final. Manter SceneWorkspace, SceneCanvas, SceneConsole e controles reais.
- [x] Achados: recuperar cartão de valor atual, operação antes → somar 1 → agora, relação com o placar, explicação da reinicialização, instruções progressivas e resumo. Manter os cinco testes, desfazer e recomeçar.
- [x] Quiz: usar balão, cartas e botões no padrão real, recuperando previsão → Ver o que acontece → cena do resultado → correção imediata → nova tentativa ou próxima pergunta. Preservar marcador de toque, sequência vazio/flores, três perguntas, resumo e passagem para objetivos.
- [x] Objetivos: preservar exemplos, testes comportamentais, mensagem de vitória, dicas, reinício e indicação da regra herdada da aula anterior, dentro do cartão real.
- [x] Conferir cada item contra o HTML original. Gerar HTML autônomo; validar fluxos completos, teclado, correção, novas tentativas, ampliação e larguras de 320 a 1280 px; inspecionar imagens.

## Arquivos

`client.tsx`: integra os recursos à experiência real e aos objetivos. `teaching.tsx`: diagrama, cartão de estado, resumo e quiz de previsão. `teaching.css`: tratamentos locais derivados dos tokens da plataforma. `shared.tsx`: desenho oficial e marcador na cena do quiz. `build.ts`: empacota os componentes, estilos e recursos no HTML independente.


Validação concluída: HTML gerado; 94 verificações de navegação, estados, correção imediata, nova tentativa, teclado, objetivos, ampliação e responsividade passaram em Chrome isolado. Sem erros de execução ou requisições de rede no arquivo offline. Comparação visual realizada em desktop e celular; fundo, borda, raio e fonte do console coincidem com a versão atual. A prévia HTTP local respondeu 200 e contém os recursos restaurados.

A ação pedida pela instrução usa o botão principal do tema; as demais permanecem como botões secundários. Ligar a reação cede o destaque a Testar com outro esconderijo, e Recomeçar a busca só ganha destaque quando os outros testes foram realizados. Validados também o retorno ao desligar a reação e a mudança de cor nas paletas azul, rosa e verde.
