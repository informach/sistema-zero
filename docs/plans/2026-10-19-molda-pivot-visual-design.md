# Pivô visual no Molda

## Objetivo e decisão aprovada

Facilitar a escolha do ponto de giro para crianças de 9 anos ou mais, preservando
os tokens, fontes, cores e padrões de interação da oficina. O usuário aprovou
a proposta em 19/10/2026: escolher diretamente na peça, com atalhos simples e
coordenadas recolhidas.

## Interface

- Um painel compartilhado entre Modelar e Animar, chamado **Onde a peça gira**.
- Explicação curta: uma roda gira pelo meio; uma porta gira pelo lado.
- Atalhos **No meio** e **Na base**, acompanhados por ícones e indicação da posição atual.
- **Escolher na peça** destaca os pontos do modelo. Um toque em um ponto coloca
  o pivô ali e encerra a escolha, liberando as alças novamente. É possível
  cancelar pelo mesmo botão ou escolher um atalho. Girar a câmera continua possível.
- Remover a lista de oito cantos identificados por sinais e eixos.
- **Ajuste fino**, fechado inicialmente, contém as coordenadas e a opção
  **Mover para cima e para baixo**. A escolha visual pertence à ferramenta básica
  de pivô; não depende da permissão de ajustes avançados.
- Evitar repetir os atalhos na dica flutuante do palco. A dica explica o gesto atual.
- Em conjuntos, os atalhos continuam disponíveis. A escolha de vértices exige
  uma peça; explicar isso junto ao botão indisponível.

## Implementação

1. Reorganizar `ScenePivotChoices` e reutilizá-lo nos dois modos da oficina.
2. Recolher os campos de pivô em `Ajuste fino` durante o uso da ferramenta.
3. Reutilizar o desenho e a seleção de vértices existentes no viewport. Encerrar
   a seleção apenas depois de um comando bem-sucedido. Não alterar geometria,
   transformações ou poses ao mudar o pivô.
4. Preservar os portões independentes de autoria, o estado de bloqueio e o desfazer.
5. Atualizar testes dos textos antigos e verificar o fluxo em navegador real.

## Verificação

- Presets, escolha de ponto, cancelamento e alternância para alças.
- Geometria, transformações e animações preservadas; um passo de desfazer/refazer.
- Escolha disponível no nível básico, respeitando revogação e peças bloqueadas.
- Controles finos recolhidos e sem estouro horizontal no painel.
- Capturas em Modelar e Animar, testes unitários relevantes, vocabulário infantil,
  TypeScript, lint e build do playground.

## Limites

Não mudar o formato dos projetos, a matemática do pivô nem as animações existentes.
Não converter conjuntos em malhas. Não acrescentar um segundo editor do pivô.

## Implementação e revisão concluídas

- O painel compartilhado substitui os oito botões de cantos, com controles de
  pelo menos 44 px e destaque usando os tokens existentes do pivô.
- A escolha no 3D oculta temporariamente as alças e a prévia de rotação, exibe
  pontos maiores e filtra a oclusão com a mesma consulta utilizada na seleção.
  Mudar de vista atualiza os pontos visíveis. Um clique bem-sucedido devolve as
  alças. Escape e o próprio botão cancelam sem editar o documento.
- Revisados bloqueio de peças, conjuntos, acesso básico, campos numéricos e
  revogação da ferramenta. Transformações, geometria e poses permanecem iguais.
- Verificação: 447 testes na regressão dos componentes e domínios envolvidos;
  72 testes focados após os ajustes finais dos controles e guias; 16 testes de
  vocabulário; TypeScript, Biome e build do playground aprovados.
- Navegador: Modelar e Animar em Chromium e Firefox, incluindo um ponto do lado
  oposto após mudar a vista; regressões de arrasto/cancelamento e alça vertical;
  três composições de tema. Capturas conferidas visualmente.
- As referências `02-modelar-pivo` refletem o novo painel. As referências de
  Pintar e Animar também foram atualizadas para a escala de pintura 1:1 já
  implementada anteriormente nesta branch.
