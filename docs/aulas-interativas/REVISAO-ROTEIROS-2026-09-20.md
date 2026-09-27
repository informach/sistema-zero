# Revisão e escrita dos roteiros de gravação

## Escopo concluído

- Os seis roteiros do Desafio do Primeiro Jogo foram conferidos contra os manifestos e a especificação de gravação.
- Foram escritos os treze roteiros de Corre Dino e os oito de O Jogo do Meu Jeito em `aulas/{slug}.roteiro.md`.
- Os 27 roteiros cobrem os 166 clipes `plannedVideo` na ordem das seções dos manifestos.

## Ajustes de conteúdo e gravação

- No Dia 4 do Desafio, a montagem da colisão passou a nomear a âncora de cada um dos quatro blocos internos. A duração do clipe foi calibrada para 140 a 155 segundos nos três arquivos da aula.
- Nos roteiros novos, cada gesto de pegar bloco usa categoria, família e seção da paleta atual; as sequências difíceis mostram âncora, campos e teste no projeto. As opções fixas de espaço, Enter, pulo, derrota e maior que foram conferidas na lista real.
- Em O Jogo do Meu Jeito, as 25 seções feitas em ferramenta externa e concluídas por vídeo terminam com pausa e autoconferência visual. A fala compara o trabalho da pessoa com sinais observáveis; não afirma que assistir ao vídeo valida automaticamente a criação.
- Na Aula 13 de Corre Dino, o clipe da Ponte aponta o seletor de modos na barra superior e a aba `script.js`. O caminho foi conferido em `packages/studio/src/components/layout/topbar/ModeSegment.tsx` e `packages/studio/src/modes/BridgeMode.tsx`. A proposta e o manifesto deixaram de tratar esse acesso como pendência.
- As durações de clipes que incluíam vários gestos, conferência ou envio foram ajustadas na proposta, no manifesto e no roteiro. A abertura da Aula 13 de Corre Dino conserva vinte segundos de observação do jogo, além da fala.

## Verificações feitas

- `python -X utf8 validar-roteiros.py`: verificador reproduzível na pasta do projeto; 27 roteiros e 166 clipes sem erros de estrutura, duração ou autoconferência nas seções externas.
- `bun docs/aulas-interativas/qa/validar-manifestos.ts`: 27 manifestos válidos, nenhum aviso de convenção.
- Auditoria dos roteiros: 166 clipes em ordem, seções correspondentes, `Na tela` e `Narração` pareados, citação de fala formada, contagem de palavras declarada e duração alinhada ao manifesto.
- Conferência de durações entre os três arquivos: 166 clipes correspondentes.
- Conferência específica de trabalho externo: 25 seções com pausa, retorno e referência visual.
- Busca nas falas: nenhuma instrução para procurar botão de play, nenhuma indicação da posição variável da ferramenta, nenhuma chamada de quem assiste de criança e nenhum travessão.

## Antes de gravar

Ensaiar os gestos no Estúdio e no Pinta com o projeto de gravação, sobretudo os sintomas que dependem de uma partida real: batida sem contato visual na Aula 10 de Corre Dino, duas naves durante a troca de arte na Aula 6 de O Jogo do Meu Jeito e coexistência provisória das pedras na Aula 7. O roteiro descreve esses estados conforme os manifestos e a plataforma; a captura final precisa mostrá-los sem fabricar o efeito na edição.
