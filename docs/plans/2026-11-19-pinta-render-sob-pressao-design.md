# Renderização de mapas sob pressão de cache

## Diagnóstico e objetivo

O lote 8a1 mediu frames entre aproximadamente 600 ms e 3 s no pior mapa
finito autorizado. A repetição com três aquecimentos e dez execuções e o
perfil CDP apontaram `paintTilemapLayers` como maior custo: 2.610.701 µs de
amostras próprias na última execução, seguido de compactação e sanitização.
Os 64 blocos visíveis de peças de 48 px exigem 576 MiB de working set, mas
o cache permanece corretamente limitado a 32 MiB. Cada frame recicla e
transfere canvases grandes, incluindo pixels que ficam fora do palco.

O objetivo deste lote 8a2 é evitar esse trabalho quando a pintura direta
conservar exatamente o resultado. Não ampliar tetos, trocar estilos ou
confundir esta otimização com streaming autoral/mapas infinitos.

## Alternativas

1. **Desenho direto sob pressão, com condições explícitas:** usa as mesmas
   células, folhas, transformações e quadros; evita canvases intermediários.
   Recomendado: alteração localizada e comparável ao renderer anterior.
2. Cache de composição: retém resultado de várias camadas, mas exige
   invalidação de dependências e pode alterar arredondamento de transparência.
3. Aumentar o cache: contraria o orçamento verificado e transfere o problema
   para equipamentos com menos memória; descartado.

Impacto 4 × confiança 4 / esforço 2 = **8**, acima do mínimo 2 da skill.

## Contrato da otimização

- Somente quando o conjunto visível exceder o orçamento do cache.
- Desenho sem suavização, transformação de destino alinhada a pixels,
  tamanho de peça e deslocamento escalados inteiros, composição normal,
  sem filtros/sombras. Fora dessas condições conservar o caminho anterior.
- Ordem de camadas, opacidade efetiva, hierarquia, flags e animações iguais.
- Não alterar o documento ou mutá-lo; não mudar RNG, desempates ou física.
- Recorte por região somente até onde o contrato do viewport permitir;
  nunca assumir que o consumidor impôs um clip que não existe.
- Memória RGBA adicional zero no caminho direto; métricas continuam
  indicando a pressão e o cache efetivamente retido.

## Prova e aceitação

Comparar imagens completas contra o renderer anterior, com folhas de cores
e alfas diferentes, oito flags, animações, várias folhas, grupos, colisão,
escala e deslocamento. Conferir condições de recusa com caminhos fracionários,
efeitos e suavização. Ensaiar Canvas nativo e Chromium; conservar as imagens
de referência e seus hashes. O probe deve desativar suavização como o palco
real antes de medir a nova linha de base, sem mudança de produto antecipada.

Repetir os dez ensaios após a alteração, registrar percentis e memória,
executar os gates pertinentes e revisar. Se os pixels divergirem, corrigir
ou restringir a condição; não relaxar a comparação. Rollback do lote por
revert do seu commit, preservando o leitor local 2 e os dados já gravados.

## Execução

Usar `writing-plans` e `executing-plans` diretamente. O usuário já autorizou
a implementação em etapas sem aprovação intermediária; nenhuma delegação.
