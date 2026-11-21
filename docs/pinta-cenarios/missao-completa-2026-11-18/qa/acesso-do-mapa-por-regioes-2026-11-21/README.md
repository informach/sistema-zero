# Acessos do mapa por regiões

O acesso existente `cellAt` e a localização da camada agora aceitam o modelo
por regiões, preservando a origem lógica negativa e os bits de cada célula.
Consultas pontuais não alocam índice. Gestos e quadros podem reutilizar
`createMapLayerCellReader`, com recorte da área ocupada e orçamento explícito.
Chunks válidos fora de ordem continuam legíveis. Camada ausente devolve vazio;
um documento de regiões sem origem é recusado, sem inventar dados vazios.

Os dois novos testes falharam primeiro pela ausência do acesso compartilhado
(`red.log`); a execução focada terminou com 48 casos aprovados. A suíte completa
do Pinta terminou com **2.297 aprovados, três controles nativos ignorados e zero
falhas**. Os mesmos três controles passaram separadamente com Python 3.12 e
pygame-ce reais. Passaram os tipos completos do Pinta e do Estúdio e a formatação.

Os **12 ensaios locais de navegador** passaram sem skip ou flaky: plataforma
precisa, atualização de cenas JavaScript/Python conservando o programa, portas,
desenhos vinculados, recusa de leitores anteriores e recuperação da importação.
Não houve login nem alteração de staging nestes ensaios. Eles verificam a
regressão do fluxo existente; não demonstram uma oficina de regiões já integrada.

O modelo de regiões permanece fora de `PintaAsset`, dos escritores e da UI.
Schema nativo 8, armazenamento físico 3, consumidores restantes e publicação
continuam no plano. A identidade visual não foi alterada.

`index.json` registra os hashes das evidências. Os logs preservam a tentativa
inicial e as execuções finais, sem substituir falha por resultado posterior.
