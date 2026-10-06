# Nave Contra Asteroides

**Título do curso:** Nave Contra Asteroides

**Descrição curta:** Monte um jogo de nave com tiros, asteroides, pontos, três vidas e uma partida que você pode recomeçar.

**Descrição:** Primeiro, jogue uma versão pronta para conhecer a nave e os controles. Depois, construa seu jogo em nove aulas: faça a nave aparecer e se mover, programe os tiros, crie os asteroides e os acertos, conte pontos e cuide das vidas. No final, coloque as telas de abertura, vitória e derrota e programe Enter para jogar outra vez. Cada aula traz os passos de montagem, testes no jogo e orientações para corrigir o que não funcionar. Você pode consultar o Caderno do Aluno durante o curso e compartilhar seu jogo no Mural quando quiser.

## O que consultar para executar

- **Sequência e implantação:** este documento.
- **Gravação:** o `.roteiro.md` da aula, ao lado de sua proposta. As falas do Zappy identificadas como texto da página não são gravadas.
- **Montagem no admin:** o `.manifesto.json` correspondente. Os vídeos ainda são moldes `plannedVideo`.
- **Revisão de texto ou estrutura:** `qa/nave-contra-asteroides.conteudo.json`; depois executar `bun docs/aulas-interativas/qa/gerar-nave-contra-asteroides.ts`. Os nove trios são derivados dessa fonte única.
- **Material de consulta:** [Caderno do Aluno](../../output/pdf/nave-contra-asteroides-caderno.pdf), apresentado na seção 2 da primeira aula. Geração e conferência em [recursos/nave-contra-asteroides](recursos/nave-contra-asteroides/README.md).

## Módulo 1 · A nave e seus controles

**Resumo:** Faça a nave aparecer, mova com as setas e programe os tiros para sair dela.

| Ordem | Aula | Resultado | Identificador |
| --- | --- | --- | --- |
| 1 | [Faça a nave aparecer](aulas/nave-contra-asteroides-primeira-nave.md) | Tela preparada e nave visível, ainda parada. | `primeira-nave` (novo) |
| 2 | [Mova a nave pelo espaço](aulas/nave-contra-asteroides-dia-1.md) | Setas, limpeza, limites e estrelas. | `dia-1` (preservado) |
| 3 | [Faça a nave atirar](aulas/nave-contra-asteroides-dia-2.md) | Disparo, movimento, desenho e limpeza dos tiros. | `dia-2` (preservado) |

## Módulo 2 · Asteroides, pontos e vidas

**Resumo:** Coloque as pedras no jogo, programe os acertos, conte pontos e dê três vidas à nave.

| Ordem | Aula | Resultado | Identificador |
| --- | --- | --- | --- |
| 4 | [Faça os asteroides cair](aulas/nave-contra-asteroides-chuva-de-asteroides.md) | Intervalo de 40 quadros, sorteio de x e queda das pedras. | `chuva-de-asteroides` (novo) |
| 5 | [Faça o tiro acertar o asteroide](aulas/nave-contra-asteroides-dia-3.md) | Retirada do par envolvido, explosão e som. | `dia-3` (preservado) |
| 6 | [Conte os acertos](aulas/nave-contra-asteroides-pontos.md) | Um ponto por acerto, mostrado no placar. | `pontos` (novo) |
| 7 | [Dê três vidas à nave](aulas/nave-contra-asteroides-dia-4.md) | Dano, proteção temporária e corações. | `dia-4` (preservado) |

## Módulo 3 · Uma partida completa

**Resumo:** Faça o jogo esperar Enter, reconhecer vitória e derrota e preparar uma nova partida.

| Ordem | Aula | Resultado | Identificador |
| --- | --- | --- | --- |
| 8 | [Comece a partida com Enter](aulas/nave-contra-asteroides-comecar-partida.md) | Abertura e partida; tiros e pedras só são criados em jogando. | `comecar-partida` (novo) |
| 9 | [Termine e recomece a partida](aulas/nave-contra-asteroides-dia-5.md) | Meta de 26, finais, reinício, revisão e publicação opcional. | `dia-5` (preservado) |

## Decisões pedagógicas

Curso normal, sem calendário de dias ou promessa de prazo. As nove aulas têm 52 seções e 48 vídeos planejados. A divisão acompanha resultados do jogo; a quantidade de seções varia conforme as experiências e montagens necessárias. A duração depende da montagem e dos testes, sem obrigação de terminar tudo em uma sessão.

Pré-requisitos: conseguir usar o teclado e seguir os encaixes guiados. Ter feito Cadê Todo Mundo? e A Chave do Farol ajuda, mas os passos não pressupõem lembrar uma peça ou um menu. A paleta fica em Áreas do projeto, Programação e Jogo 2D, com os tipos necessários até cada etapa. Nenhum HTML, CSS, modo de código ou ferramenta nova entra como requisito.

O primeiro projeto está vazio, com Jogo 2D disponível. Os blocos já oferecem os desenhos e efeitos; a pessoa monta as regras. Nas aulas seguintes, continuar o próprio projeto enviado. O projeto inicial do manifesto só serve de alternativa se não houver envio anterior. A abertura jogável usa o jogo original completo e pede participação, sem exigir vitória.

As 19 experiências reaproveitam cenas existentes e antecedem a primeira aplicação dos conceitos: preparação e repetição; coordenadas; criação e desenho; atualização por quadro; movimento e velocidade; limite; camadas; evento; posição fixa ou lida; direção da velocidade; limpeza de grupo; intervalo; sorteio; par da colisão; variável; preparação das vidas; proteção; estado e reinício. Cada uma orienta todos os testes necessários, sem palpite obrigatório nem pergunta final repetida. A cena de movimento originalmente criada para o Farol agora também representa a nave, com o mesmo motor e os mesmos controles.

Desde 06/10/2026, o vídeo de cada experiência é uma demonstração. A primeira frase diz o conceito ("Esta é uma experiência para a gente entender…", ou "Esta é a mesma experiência…" quando a cena volta com outra meta). Depois de "Olha aqui:", o narrador faz os testes na primeira pessoa, mostra o resultado real conferido no motor da cena e explica por que ele aconteceu, ligando-o ao bloco da montagem. Quando ajuda, há uma comparação com o dia a dia e um meme ilustrado nosso descrito na nota de tela. Só no fim vem "Agora é a sua vez". O vídeo do jogo pronto segue o mesmo raciocínio, com um único gesto de exemplo. Os passos para a criança continuam no imperativo nas instruções da experiência, na ponte do Zappy, nas montagens e no caderno.

A limpeza da imagem retoma a experiência de desenho da primeira aula em uma montagem própria; a limpeza do grupo é outra ideia e tem sua própria experiência na aula dos tiros. A preparação das vidas e a colisão da nave também têm montagens separadas. Nas retomadas, a fala localiza a experiência, mostra o que ainda falta no próprio jogo e só então orienta os encaixes, com o destino visível antes de buscar cada peça. Nas aulas finais, a comparação com a meta aplica variável, leitura e condição já trabalhadas; a constante é apresentada como o valor da meta que permanece igual durante a partida.

Há quatro revisões curtas, nas aulas 2, 5, 7 e 9. Retomam ideias já montadas e testadas, distribuídas ao longo deste curso maior. Cada seção contém somente Zappy → quiz, com explicação após o envio, acerto de todas as questões e tentativas ilimitadas sem espera. Configurar também as tentativas no admin; o manifesto não define essa política global sozinho.

Cada etapa com critérios termina em **Verificar esta etapa**, correção se necessária e **Objetivo da etapa cumprido!**. A entrega termina em **Salvo → Enviar para o professor → Enviar → Concluir aula**. A última aula ensina a publicação completa, opcional, depois do envio: o resumo já vem preenchido, e a comemoração do Mural convida a copiar o link de jogar e mandar para a família e os amigos antes de Fechar. O caderno fica em um único bloco de materiais, sem exigência de leitura ou download.

## Continuidade do código

`qa/nave-contra-asteroides-projetos-qa.ts` permanece como referência original, sem alterações. Os resultados das aulas 2, 3, 5, 7 e 9 correspondem exatamente aos seus cinco marcos. `qa/nave-contra-asteroides-etapas.ts` deriva quatro estados intermediários, retirando comandos ainda não ensinados. A saída de cada aula é a entrada preparada da seguinte.

Valores finais preservados: tela 800 × 480; nave em (400, 410), tamanho 54 × 62, velocidade 7; estrelas 1; tiro com raio 5, vx 0, vy -9, centro x e posição y da nave; asteroides a cada 40 quadros, x sorteado, y -30, tamanho 40, vx 0, vy 3; um ponto por acerto; três vidas, dano 1, proteção 45 e tremor 8; alvo 26; estados inicio, jogando, vitoria e fim. A derrota é verificada depois da vitória, preservando o comportamento original em empate no mesmo quadro. Cores continuam personalizáveis.

## Aplicação no admin

Os nomes visíveis são os títulos das aulas. Os cinco slugs antigos continuam como identificadores técnicos das aulas existentes; não são divisão pedagógica por dias. Todos os projetos mantêm a cadeia `nave-contra-asteroides`.

1. Exportar a versão atual e conferir IDs, ordem, vídeos, envios e conclusões. Manter slugs não garante, sozinho, preservar progresso em andamento numa reimportação.
2. Criar somente os quatro destinos novos e ordenar as nove aulas conforme as tabelas. Não recriar as cinco existentes nem substituir destinos do Desafio. Reconciliar materiais movidos e `retireBlockKeys`, preservando histórico de mídias e envios.
3. Preservar conclusões e conquistas anteriores. Para quem concluiu os marcos antigos, as aulas inseridas detalham conteúdo já coberto: conferir acesso à continuação e não exigir refazê-lo por efeito da nova ordem. Para quem está em andamento, conferir o projeto salvo antes de retomar.
4. Gravar os roteiros e vincular as mídias revisadas. `plannedVideo` não publica uma gravação. Anexar o caderno na primeira aula, seção 2; `materials.items` fica vazio até haver arquivo hospedado, sem URL inventada.
5. Configurar **videoBeforeActivity = true** nesta proposta e conferir com perfil de aluno. A ordem editorial não configura essa opção automaticamente.
6. Conferir uma pessoa nova e outra em continuidade: abrir, assistir, experimentar, montar, verificar, enviar, confirmar, reabrir o mesmo projeto, avançar e publicar opcionalmente. Ensaiar com crianças para ajustar ritmo, linguagem e duração.

Esta entrega altera materiais locais. Gravação, vínculo das mídias e aplicação no admin são etapas de produção; a revisão não declara o curso publicado nem a compreensão infantil validada.

Registro da retomada e das verificações: [revisão de 05/10/2026](qa/revisao-nave-2026-10-05.md), com a nota da revisão de 06/10/2026.

## Conferência local

```powershell
bun docs/aulas-interativas/qa/gerar-nave-contra-asteroides.ts
bun docs/aulas-interativas/qa/validar-manifestos.ts nave-contra-asteroides
python -X utf8 docs/aulas-interativas/validar-roteiros.py nave-contra-asteroides
bun test docs/aulas-interativas/qa/nave-contra-asteroides.test.ts
python docs/aulas-interativas/recursos/nave-contra-asteroides/gerar-materiais.py
```

O teste existente `packages/studio/src/blockly/__tests__/naveEditorial.test.ts` é executado de dentro de `packages/studio`, com seu preload. Cobre os cinco marcos originais, disparos, colisões, pontos, derrota, vitória real em 26 pontos e reinício limpo.
