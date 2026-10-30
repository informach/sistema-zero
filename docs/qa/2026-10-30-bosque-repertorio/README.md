# Corrida do Bosque: repertório da trilha

Conferência local do C01b2a, em 30/10/2026. Sem conta, API remota, publicação ou banco.
Os quatro jogos usam os arquivos do gerador, o runtime oficial Jogo 2D e o documento de
prévia do Estúdio. O programa usa somente blocos; não há código HTML/CSS pedido à criança.

## O que mudou

Largada por Enter ou + no controle. A corrida permite escolher os quatro bichos pelas
setas indicadas ao lado do nome e desfazer a escolha antes de começar. Espaço ou A avança
o escolhido. Pedras usa Espaço/A no extra para outra largada, Noite para alternar a luz e
Placar para zerar as vitórias. As imagens inertes dos antigos botões foram retiradas.

O principal, Pedras e Placar usam somente fontes locais da trilha até Construtor. Noite
continua uma atividade opcional com opacidade de Cadê Todo Mundo. Isso descreve a fonte
pedagógica integral, não os requisitos derivados pelo Members a partir dos tipos novos.
Nada foi concedido artificialmente nem publicado.

## Navegador

Comando: `SZ_CHECK_CHROMIUM=<Chrome local> bun docs/desafios-do-jogo/bosque/conferir-corrida-browser.ts`.
Chrome local, computador 1280 × 844 e celular emulado 390 × 844. Oito casos aprovados:

- Corrida: escolher/desfazer cada bicho, dar a largada, avançar o escolhido, não trocar
  durante a corrida, ter um vencedor e recomeçar.
- Pedras: os quatro pulam, completam a descida, há vencedor e o extra recomeça.
- Noite: acender, apagar, acender sem mover os bichos; largada e repetição.
- Placar: uma corrida vale um ponto, nova largada conserva o ponto, extra zera.
- Todos: eventos de teclado ou toque em botões reais, canvas dentro da tela, sem rolagem
  horizontal, erro de página/console ou recurso externo. O navegador fecha no final.

Na primeira execução, a leitura do verificador tentou tratar um caminho de propriedade
como nome de variável. A correção percorre a propriedade do objeto registrado, como faz
o executor. Não foi falha do jogo. Nos primeiros prints, o pad cobria a legenda no
computador. O modo automático agora mostra o pad nos aparelhos de toque. As legendas
passaram a 18/20 unidades do palco e a instrução do extra ficou mais curta.

Prints finais: [corrida no computador](corrida-computador.png),
[corrida no celular](corrida-celular.png), [pedras no celular](pedras-celular.png),
[noite no computador](noite-computador.png), [noite no celular](noite-celular.png),
[placar no computador](placar-computador.png), [placar no celular](placar-celular.png).
Os oito casos estão em [resultado.json](resultado.json). Não é qualificação em celular físico.

## Provas de comportamento e estrutura

`packages/studio-runtime/tests/bosque-browser.test.ts` usa `runtime/check-objectives.mjs`,
o executor real. Confere gabaritos, iniciais e defeitos causais: largada sem reposicionar,
corrida que não para, pulo sem descida, luz que não apaga e largada que apaga placar.
Os objetivos estruturais também passam pelo importador Blockly e pelo gerador do Estúdio.
Os projetos iniciais não passam nos objetivos que a pessoa deve completar.

O teste de repertório falhou com o manifesto anterior pelos dois tipos exclusivos de
extra e passou depois da troca dos controles. A ida e volta por Blockly preserva o código
gerado. Geradores e JSON foram regenerados juntos, para Kids e adulto.

Resultados finais: contratos 208 aprovados; conteúdo 18 aprovados; executor real 63 asserções
aprovadas; Studio Runtime 386 aprovados, 34 ignorados e zero falhas. Os ignorados são ensaios
nativos sem configuração nessa execução, incluindo navegadores das atividades não alteradas.
O Bosque foi executado separadamente com Chrome configurado. Tipagem de contratos e do Bosque
com 8 GB, Biome e `git diff --check` aprovados.

A primeira suíte ampliada não tinha `runtime/node_modules`, necessário aos builds Pro, e
teve timeouts de I/O. Foi repetida após `npm ci --ignore-scripts --no-audit --no-fund` no
runtime, com `bun test --timeout 30000`. Não houve mudança no lock, CI ou nos testes para
esconder essas falhas. A suíte de contratos foi repetida sozinha, com o limite original.
