# P52 · Inventar as regras

Produção local em 14/10/2026. Nove slides de 1080 × 1350, proporção 4:5 e sRGB. Terceira publicação da semana 13; desejo W22; sem série; convite para seguir o perfil.

## Copy e direção

Fonte: [ficha vigente do P52](../../../../postagens/11-p51-a-p60.md#p52). A copy e a legenda foram preservadas integralmente: [texto](copy.json), [verificação da montagem](verificacao.json). [Direção visual](../../../../postagens/05-direcao-visual-e-producao.md).

A menina é fictícia, conforme a direção de produção. O futebol aparece como ideia no papel, e Bichinhos do Quintal como exemplo real da plataforma. A ligação é a escolha de regras: uma opção mais forte que pode errar e outra mais fraca que sempre acerta. Não se anuncia um curso de futebol nem se atribui o projeto a uma aluna.

## Fotografias e desenhos

Seis imagens produzidas com a ferramenta nativa image_gen.imagegen: [prompts e referências](prompts.json), [origens e hashes](imagens-geradas.json). Os arquivos selecionados foram copiados para esta pasta; os originais foram preservados. A capa serviu como referência de aparência para os slides 2 e 9, com cenas novas. As seis imagens são distintas.

Slides 3, 4 e 8: suportes fotográficos gerados com papel em branco; diagramas e palavras aplicados em SVG na montagem editável. São esboços no papel, sem simulação da interface da plataforma. As anotações usam Caveat. O texto principal usa Nunito. Não há texto sobreposto aos rostos nem rodapé Cena ilustrativa.

## Demonstração real

Origem: packages/studio/src/official-extensions/game-2d-advanced/examples/bichinhosDoQuintalExample.ts. [IR original](jogo-original.json) e [código exportado](jogo-original.js). O runtime e o gerador são os atuais do projeto. As regras e a aparência do exemplo foram preservadas.

Para chegar diretamente à cena, a API pública concedeu Fogoso no nível 5 e iniciou uma batalha selvagem contra Folhinha no nível 6, ambos possíveis no exemplo. Um observador somente de leitura registrou os estados. O primeiro screenshot mostra o menu de golpes com Brasa selecionado; uma Investida e a resposta do adversário foram executadas; o segundo screenshot mostra o menu novamente, agora selecionando Investida. [Estados capturados](batalha-capturada.json). O slide 6 aproxima essa segunda captura com recorte CSS, sem redesenhar controles ou repetir a primeira imagem.

Os dois blocos originais do Fogoso foram renderizados pelo Blockly e renderer zelos da plataforma. Somente o layout nativo de entradas passou para linhas separadas, para facilitar o enquadramento. Nenhum nome, valor ou conexão foi inventado. [Texto dos blocos](blocos-capturados.json), [Brasa](07-brasa.png), [Investida](07-investida.png).

Brasa: dano configurado 20, acerto 90%, tipo fogo. Investida: dano 12, acerto 100%, tipo normal. O runtime monsterBattle.ts também considera força, defesa, vantagem de tipo e variação aleatória no dano. A copy não promete retirada exata de 20 ou 12 pontos. O acerto é governado pela chance configurada.

O navegador integrado não estava disponível; as capturas locais e a montagem foram renderizadas com Playwright headless. Não houve acesso a conta real nem alteração de código da aplicação.

## Entrega

- [Prévia](../index.html), [montagem editável](../montagem.html), [legenda](../legenda.txt).
- [Textos alternativos](../texto-alternativo.txt) e [orientações de publicação](../publicacao.txt).
- [Verificação final](entrega-verificada.json): copy, dimensões, fontes, layout, links, originais e evidência do jogo.
- [Licença Nunito](LICENSE-Nunito) e [licença Caveat](Caveat-OFL.txt).

Scripts reproduzíveis em output/instagram/p52-2026-10-14/. Revisão visual e técnica local, sem teste de conversão. Próximo carrossel: P09, primeiro post da semana 14.
