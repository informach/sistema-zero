# Revisão do contorno de seleção e do Plano no Molda

## Diagnóstico

O relato distingue a seleção funcional (árvore e alças) do contorno ausente no 3D,
tanto no playground quanto na plataforma. Caixas e cilindros sem reflexão exibiram
o contorno nos testes. A investigação reproduziu a ausência em formas invertidas
por um eixo: a matriz tem determinante negativo e o Three inverte o descarte de
faces. Os triângulos das linhas largas são expandidos na tela e conservam sua
orientação; por isso eram descartados.

O teste de navegador da caixa invertida em X registrou zero pixels de contorno
antes da correção. A contagem exclui os controles HTML amarelos sobre o canvas.

## Correção e revisão

As linhas de ajuda e o destaque das arestas usam material de dois lados com uma
única passagem. Os dois pontos de criação de `LineMaterial` no Molda foram
conferidos. Teste de profundidade, largura, cor, deslocamento contra sobreposição
e descarte dos recursos seguem seus contratos anteriores. Os materiais das peças
e os arquivos exportados não recebem esse material de ajuda.

O usuário confirmou que o contorno voltou a aparecer na cópia no playground.
O teste permanente cobre caixa e cilindro, orientação original e reflexão em X/Y/Z,
duplicação, troca entre original e cópia e seleção de linhas na edição da malha.
Ele usa o seletor de projeto e os botões reais da interface.

## Plano horizontal

O botão Plano foi acrescentado às formas, com os mesmos tokens e alvos de interação.
Cria uma malha de quatro vértices e uma face de 2 × 2 unidades, sem espessura,
visível e pintável pelos dois lados. Não foi adicionado um formato de geometria
ao contrato de arquivo. Leitura nativa e GLB preservam a malha e o material.

Dois contratos precisaram ser ajustados para superfícies planas: redimensionar os
eixos com extensão conservando os eixos vazios, e detectar sobreposição entre
caixas envolventes sem espessura na colocação ao lado. Há testes de crescimento,
trava de grupo, várias peças planas, duplicação independente, pintura e extrusão.
Os campos dos eixos sem extensão ficam em zero e desabilitados; Puxar cria volume.
O inventário da interface admite exatamente o novo botão e verifica sua presença.

## Achados da revisão visual

- A mensagem de importação mudou, mas quatro esperas em três arquivos E2E ainda
  usavam o texto antigo. Elas agora usam `COPY.gallery.imported(1)`, impedindo que
  a notificação temporária apareça nas capturas de referência.
- O menu do palco ultrapassava a área de desenho em Animar a 1024 e 768 px.
  O teste reproduziu ambos os casos. O menu agora mede o espaço disponível dentro
  do palco e rola quando necessário, acompanhando o redimensionamento da linha do
  tempo. Os listeners e observers são removidos ao desmontar. O cenário passou
  nas quatro dimensões e três modos, verificando cada controle após rolar até ele.
- Nove referências de Modelar foram atualizadas para o botão Plano. A comparação
  bruta encontrou zero a 58 pixels diferentes fora da barra esquerda, abaixo do
  limite existente de 100. As referências de Pintar e Animar não mudaram.

## Limitação externa do WebKit de testes no Windows

A composição de WebGL após redimensionar seu buffer está quebrada no WebKit
distribuído com o Playwright para Windows. O readback da cena confirmou o desenho
presente, enquanto a captura composta ficou vazia. O problema é acompanhado em
[microsoft/playwright#42885](https://github.com/microsoft/playwright/issues/42885).
Oito casos de arestas após redimensionamento são pulados somente nesse motor/OS;
os mesmos testes continuam habilitados no Linux e macOS. Não foi aplicada uma
alteração de renderização ao produto para contornar uma falha do motor de testes.

## Evidências

- Reprodução anterior: `.cache/duplicate-contour-red.log` — caixa invertida sem contorno.
- Primeira verificação da seleção inteira: 24 cenários aprovados nos três navegadores.
- Testes de viewport, contorno e componentes: 58 aprovados, zero falhas.
- Tipos do Molda: aprovado.
- Biome do Molda: aprovado, 1.471 arquivos.
- Build do playground: aprovado.
- Suíte completa após adicionar Plano e corrigir o menu: 3.413 aprovados, zero falhas.
- Seleção e Plano em navegador local: 46 aprovados; 8 casos de WebKit/Windows
  limitados pelo problema acima. Alças do Plano: mais 3 aprovados, um por motor.
- Vocabulário do Community Kids: 16 aprovados.
- Revisão E2E de referências, painel, importação, autoria e linha do tempo: 32
  aprovados, zero falhas, incluindo as novas referências sem atualizar snapshots.

Logs adicionais em `packages/molda/.cache/duplicate-contour-*`. A confirmação no
projeto específico do usuário e a publicação em staging são acompanhadas separadamente.
