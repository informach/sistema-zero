# Recife e Maré, fase3-01

Referência: proposta local `Arquipélago Vagalume.html`, fornecida em 29/10/2026. O Canvas e a página de andamento não estão acessíveis nesta sessão.

## Implementação

- [x] Registrar a ilha completa e o RecifeVivo no ciclo existente de carregar e soltar.
- [x] Ligar a Maré ao morador genérico, com colisor só do corpo e conversa de apresentação sem gravar amizade.
- [x] Incluir a caverna na espera pelos colisores e na roda de nado, sem acrescentar chão invisível.
- [x] Preparar a lagoa pelo nó `agua`, com registro e retirada em `movimento.aguas`.
- [x] Testar regras, GLB, carregamento, colisões e faces coplanares.
- [x] Conferir ponte, cais, caverna, lagoa e conversa no navegador, em computador e celular emulado.
- [x] Revisar, executar testes, typecheck e lint e documentar a entrega.

## Decisões propostas

A Maré fica na âncora `casa-mare`, voltada na direção da âncora `morador`. A apresentação proposta usa somente o papel descrito no documento: “Sou Maré. Faço mapas do mar.” e “Sem meus mapas, o mar perdeu as rotas.” Não há pedido, presente nem promessa de recompensa. A amizade espera uma próxima versão do salvamento, fora da V10 em andamento.

As distâncias para olhar e conversar e os tempos de animação seguem o Bento. O corpo da Maré usa cilindro com raio 0,46 e altura 1,45, medidos do modelo, com câmera na cabeça a 1,2. O limite visitável do Recife fica em 24 unidades: inclui a boca da caverna a cerca de 21,3 do centro, a aproximação por fora de 2 unidades usada no teste e a folga do corpo. As boias conservam a folga das outras ilhas, 4,6 unidades, ficando a 28,6 do centro. Esse limite serve ao carregamento e ao nado, sem transformar o mar em terreno sólido.

## Modelo atualizado pela sessão de Blender

A primeira leitura encontrou uma lagoa decorativa sem bacia. A pendência foi resolvida pela sessão de arte no commit `02cfe22f4`, recebido por pull antes de continuar: malha `agua`, fundo de 0,85 e rampa em `col-terreno`, com `lagoaFunda` em `enfeites`. `tests/lagos-das-ilhas.test.ts` confere a profundidade e as rampas. Nenhum GLB foi gerado ou alterado por esta implementação.

Navio, labirinto, mergulho e plataformas das Nuvens ficam fora desta fase. Não há pedido de modelo adicional.

## Câmera sob o teto da caverna

O achado foi corrigido: além de subir, a câmera compara uma saída abaixo do teto, usando a mesma
sonda e preservando todas as colisões. A saída baixa mira uma folga de 0,35 abaixo do alvo, já
definida em `FOLGA_DA_CAMERA`; a posição horizontal exata tangenciava a face inferior do teto.
O desvio só muda com ganho superior a 0,5, como a grua existente, e é suavizado ao entrar e sair.
Não altera a inclinação escolhida pela pessoa. A integração no controlador ficou restrita à
escolha desse desvio, com regra pura em `sistemas/camera.ts` e testes em `camera-sob-teto.test.ts`.

O roteiro de navegador reproduziu a falha antes da correção e passou depois no computador e
no celular emulado. Os prints `recife-computador-caverna-corrigida.png` e
`recife-celular-caverna-corrigida.png`, na pasta de QA, mostram o resultado.
