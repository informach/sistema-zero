# Design — resolução integral dos achados do Jogo 2D

> Nota de 2026-08-02: a decisão histórica de manter toda a extensão em
> `iniciante-2d` foi substituída em 0.57.0. O perfil inicial agora contém somente
> o Kit Essencial já usado em projetos reais; o restante entra em `iniciante-3d`.

**Data:** 2026-07-20  
**Escopo principal:** `packages/studio`  
**Correção de conteúdo isolada:** `packages/studio-aulas`

## Objetivo

Resolver os achados ainda abertos no review da extensão Jogo 2D sem esconder blocos, quebrar projetos existentes ou criar correções específicas para os exemplos. O trabalho deve corrigir cada causa na camada que a possui e manter o comportamento didático da extensão.

## Decisões do produto

- Todos os blocos do Jogo 2D continuam disponíveis no nível `iniciante-2d`. O professor controla a progressão dentro da aula; a extensão não fará liberação gradual.
- O preview do editor mostrará controles virtuais automaticamente em dispositivos touch quando o projeto usar teclado. O aluno poderá ocultá-los e restaurá-los.
- A correção do projeto de asteroides consiste em proteger também a raiz periódica com `se a tela atual é jogando?`.

## Abordagem escolhida

Adotar consolidação declarativa incremental. As correções comportamentais entram com testes próprios. Registros mecânicos passam a derivar de fontes já existentes, enquanto parser, gerador e runtime permanecem explícitos onde expressam comportamento real.

Uma reescrita total do compilador e do runtime foi descartada porque ampliaria o risco de regressão sobre 196 blocos sem benefício proporcional para as crianças. Correções pontuais sem consolidação também foram descartadas porque manteriam a duplicação que originou o achado arquitetural.

## Gameplay e entrada

`drawTileMap` calculará as linhas e colunas que cruzam o retângulo visível do mundo. O cálculo considerará câmera, deslocamento, centralização, tamanho manual e linhas irregulares. Mapas que cabem inteiros manterão o mesmo resultado visual; mapas grandes deixarão de desenhar células fora da viewport.

`moveToward` limitará o deslocamento a `min(velocidade, distância)`. Ao alcançar o alvo, o sprite ficará exatamente sobre ele e `vx/vy` registrarão o deslocamento efetivo do quadro. Distância zero produzirá velocidade zero. `arrowsX` alterará apenas posição e velocidade horizontais.

O runtime normalizará teclado em um único ponto. Setas e `e.code` continuarão funcionando; letras de `e.key` serão comparadas em minúsculas. Eventos, perguntas de tecla e controles WASD usarão a mesma regra.

## HUD acessível

O palco terá uma região viva exclusiva para o HUD, separada da descrição e dos anúncios de cena. `drawScore`, `drawBar` e `drawSpriteHealth` enviarão descrições curtas para esse canal.

O runtime armazenará o último valor de cada indicador e só agendará anúncio quando houver mudança. Mudanças próximas serão agrupadas em uma única mensagem, com frequência limitada. O restart limpará valores e agendamentos junto com o domínio do palco.

## Controles touch no preview

Um componente pequeno e acessível ficará sobre o `PreviewIframe`. Ele será renderizado quando três condições forem verdadeiras:

1. o dispositivo expuser toque ou ponteiro primário grosseiro;
2. o projeto usar um nó de IR que dependa de teclado;
3. o aluno não tiver ocultado os controles.

O controle terá direcional, Espaço e Enter. `pointerdown` enviará `keydown`; `pointerup`, `pointercancel` e perda de captura enviarão `keyup`. Os botões terão nomes acessíveis e estado pressionado. Ao ocultar, um botão compacto permitirá restaurar o gamepad. O canal existente `sz:gamepad` continuará sendo a única ponte para o iframe.

## Asteroides e isolamento do conteúdo

O roteiro que originou o projeto receberá um segundo `Se jogando` dentro de `A cada tantos quadros`. A primeira guarda continuará protegendo atualização, desenho e poda; a segunda protegerá a criação periódica.

A alteração do roteiro será feita e validada como uma unidade isolada do `studio-aulas`. Ela não dependerá de APIs internas do Studio.

## Consolidação arquitetural

A allowlist de blocos das extensões oficiais será derivada de `OFFICIAL_CATALOG[].blockly.blocks`. Isso remove as listas manuais duplicadas do `projectStore` e torna o catálogo a fonte única para sanitização.

As chaves públicas do runtime Jogo 2D e a montagem de `window.SZGame2D` compartilharão uma tabela declarativa. O contrato TypeScript continuará explícito, mas a lista de nomes e o objeto injetado não poderão divergir.

A suíte criará um programa TypeScript sobre o JavaScript final injetado, com DOM e declarações de fronteira controladas. O teste verificará erros semânticos, não apenas sintaxe ou execução parcial. Assim, renomes e referências inexistentes falharão no CI.

## Testes e critérios de aceite

- Um tilemap 128 × 128 desenha somente a faixa visível; câmera e bordas preservam os índices corretos.
- `moveToward` não ultrapassa o alvo e expõe velocidades coerentes.
- `arrowsX` preserva `vy`; WASD funciona com letras maiúsculas e `KeyA/KeyD/KeyW/KeyS`.
- O HUD altera a região viva apenas quando valores mudam e agrupa atualizações.
- O gamepad aparece apenas em touch e projetos com teclado, envia pares completos de eventos e pode ser ocultado/restaurado.
- O roteiro dos asteroides contém guardas para a atualização e para a criação periódica.
- A allowlist deriva do catálogo; nenhuma extensão perde blocos ao importar ou reabrir projetos.
- O bundle final do runtime passa pela checagem semântica.
- As suítes de Jogo 2D, Jogo 2D Avançado, importação, preview, typecheck, lint e E2E continuam aprovadas.
