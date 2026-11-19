# Lote 8.3 — Interface e fluxo de exportação

Continuação do mesmo lote, após runtime/pacote Three, GLB único e preparo autorizado. Não iniciar 8.4/8.5 antes de fechar este fluxo e suas verificações. Reutilizar a interface aprovada e os componentes/tokens existentes do Molda.

## Intenção de interface

A pessoa acabou de compor um cenário e quer levá-lo para um jogo ou outro programa sem perder o que montou. Deve reconhecer o cenário e a revisão, escolher o destino, compreender as licenças e receber um arquivo conferido, podendo cancelar ou repetir uma falha.

Vocabulário do produto: cenário, mundo, biblioteca, peças, terreno, revisão guardada e arquivo para levar. Cores e superfícies são as existentes do Molda: papel, creme, céu, lilás, amarelo da ação principal e tinta dos textos, com os equivalentes do tema escuro. A assinatura é a mesma oficina: título do cenário/revisão guardada, controles de levar o trabalho e medidas das peças reais. Usar diálogo nativo, botões, campos e estados do Molda; não introduzir um dashboard, nova paleta ou outro sistema de janelas.

## Sequência

- [ ] Abrir Exportar no cenário e nos cartões do mundo. Guardar gestos pendentes bloqueia a revisão errada; prévias/edições transitórias precisam terminar antes da abertura. Teclado, toque e foco modal não alteram o cenário por baixo.
- [ ] Carregar o preparo autorizado do host. Conferir cenário/revisão/digest e informar bibliotecas restritas nominalmente. Não aceitar contexto fabricado a partir do estado local. Revisão divergente oferece reabrir/atualizar de forma explícita.
- [ ] Orquestrar o compilador único e os destinos já implementados (Three e GLB). Junção estática por região é opção de distribuição, sem alterar autoria; mostrar recursos/medidas reais, avisos e limites. Os destinos de 8.4/8.5 entram somente quando funcionarem.
- [ ] Progresso por etapa, cancelamento, falha/repetição, resultado válido e download. Uma execução ativa; fechar/desmontar cancela, respostas antigas não substituem novas, URLs temporários são liberados e intermediários não ficam retidos após o resultado.
- [ ] Ensaiar download/reabertura dos dois formatos no Chrome, erros/recusa/revisão divergente, licença, guardar pendente, cancelamento e descarte. Quatro layouts, temas claro/escuro, sem perda de foco/rolagem ou sobreposição de controles. Preservar autoria/histórico.
- [ ] Regressão/tipagem/build, revisão, capturas/vídeo, relatório e commit/push. Só então fechar 8.3 e iniciar 8.4. Validação de implantação remota permanece no encerramento global.
