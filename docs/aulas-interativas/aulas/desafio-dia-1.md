# A Chave do Farol · Dia 1 · O personagem ganha movimento

## Resumo

- Estado de entrada: cenário, sprites, desenho por quadro e comportamento do barco preparados; sem controles nem movimento.
- Vitória do dia: personagem anda em quatro direções e permanece dentro da tela.
- Seções na entrada deste review: 1 · Seções finais: 1.
- Clipes na entrada deste review: 1 · Clipes finais: 1.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
| --- | --- | --- | --- | --- | --- |
| Sprite | Vocabulário | Na identificação do personagem | Definição curta antes de nomear o bloco | Na montagem | Evitar termo desconhecido na instrução |
| Controles e movimento | Não | No jogo | Setas aparecem; personagem se move depois do segundo bloco | Após cada montagem | Mostrar controles não move alguém sozinho |
| A cada quadro | Sim, em nível inicial | No movimento contínuo | Explicar que o jogo repete o que está no bloco | Antes do encaixe | Justificar onde colocar o movimento, sem aula paralela de animação |
| Velocidade | Não exige cena | No deslocamento | Explicar quanto anda a cada repetição; manter 3 | Ao conferir o campo | Não mandar redigitar o valor que já vem correto |
| Borda e ordem | Relação concreta | No jogo | Testar a saída e depois segurar o personagem dentro da tela | Problema antes da correção | Mover primeiro, conferir o limite depois |

## Diagnóstico do desenho atual

A introdução já apresenta o jogo pronto. Os antigos vídeos `video-d1-chegada` e `video-d1-movimento` permanecem aposentados, com o contexto necessário incorporado à montagem.

O review encontrou “sprite” no nome do bloco antes da definição. A explicação agora vem primeiro, também no caderno. O seletor de borda não tem campo ctx; as instruções correspondem ao bloco atual. A velocidade inicial 3 é mantida.

## Proposta final

### Seção 1. Faça o personagem andar pelo mapa

- **Intenção:** construção e entrega (`delivery`).
- **Por que existe:** produzir o primeiro comportamento jogável.
- **Conclui quando:** vídeo, três critérios de projeto aprovados e envio confirmado.
- **Blocos:** `video-d1-borda`, `ponte-d1-borda`, Estúdio `projeto` e ajuda opcional `ajuda-d1`.

**Ponte do Zappy na página (não gravar):** Agora monte o movimento do seu personagem. Teste as quatro direções e as bordas, depois use Verificar esta etapa antes de enviar o projeto.

A abertura conecta a versão pronta experimentada à versão com personagem parado. Construir controles só com quatro direções no fim de Ao iniciar; movimento dentro de A cada quadro depois do cenário; limite de tela imediatamente depois do movimento.

Testar com o dispositivo disponível, incluindo as quatro bordas. Não exigir teclado e toque de quem só tem um deles. Terminar em **Verificar esta etapa → Objetivo da etapa cumprido! → Salvo → Enviar para o professor → Enviar → Concluir aula**.

## Experiências e demonstrações desta aula

Não há cena paralela: controles, movimento e bordas podem ser testados no próprio jogo. Conferir a saída pela borda antes de mostrar a solução, sem encenar um defeito inexistente. A prévia atualiza automaticamente; Atualizar não é um passo a repetir a cada encaixe.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
| --- | --- | --- | --- | --- |
| `video-d1-borda` | Contexto, montagem completa, bordas, verificação e envio | Roteiro atual e projeto inicial | 4 a 5 min, sem acelerar os encaixes | Regravar |

## Continuidade

Preservar a seção `borda`, a chave `projeto` e a cadeia `desafio-primeiro-jogo`. A criança programa as regras de movimento, não a arte ou o barco preparado.

Valores finais: controles directions, personagem, velocidade 3, movimento antes do limite de tela. O Dia 2 assume esse trabalho enviado; a retomada preparada é alternativa somente quando não há envio anterior. Caderno na introdução e Como Fazer para ampliar a atividade ou pedir ajuda.
