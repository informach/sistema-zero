# Como funcionam demonstração e experimentação

A aula é montada pelo professor. Ele decide quais conceitos serão demonstrados, quais precisam de experimentação e quando entram as etapas de criação. Uma atividade não se transforma automaticamente na outra.

| Escolha do professor | O aluno vê | O aluno pode fazer | Quando termina |
| --- | --- | --- | --- |
| Demonstração com cena nativa | Uma cena com uma sequência preparada e uma fala curta por etapa | Observar, pausar, avançar por passos, seguir para a próxima etapa e rever desde o início | Ao acompanhar todas as etapas |
| Demonstração em vídeo | Um clipe mostrando o conceito, com narração e legendas | Assistir, pausar e rever | Ao assistir a 90% do clipe isolado |
| Experimentação | Uma missão específica, a cena e os controles relacionados ao objetivo | Manipular o que a missão permite, pedir pistas, desfazer antes da conclusão e comparar resultados | Ao realizar a investigação prevista; a cena para e apresenta o resultado observado |
| Aplicação | O próprio projeto no Estúdio, com orientação e critérios da seção | Construir, testar e verificar o objetivo pedido | Conforme os critérios definidos para aquela etapa |

## O professor prepara

1. Organiza as seções da aula e escolhe a intenção de cada uma.
2. Acrescenta uma cena didática e escolhe o conceito na biblioteca.
3. Define o uso do bloco: **demonstração** ou **experimentação**.
4. Escreve título, orientação e pistas quando aplicáveis. Pode ajustar as condições iniciais disponibilizadas pela cena, como o impulso inicial nas atividades de salto.
5. Na demonstração, usa o roteiro pronto ou edita as falas, os destaques e as ações. A edição avançada de ações valida os comandos e os tempos de observação. A cena pode esperar um acontecimento, dentro de um prazo definido.
6. Confere a experiência no ensaio, incluindo tamanho estreito, e publica pelo fluxo editorial existente quando estiver pronta.

O professor pode usar somente uma demonstração, somente uma experimentação ou ambas em blocos separados. Os roteiros prontos servem como ponto de partida. Não é obrigatório demonstrar antes de experimentar.

A biblioteca inicial cobre 14 missões do Corre Dino. Cada missão já define os controles e os critérios relacionados ao conceito. Criar uma simulação de outro assunto exige desenvolver uma nova cena; o editor não é um construtor universal de simulações.

## Um exemplo concreto: salto

**Somente demonstrar:** o professor mostra dois saltos, com uma fala explicando a diferença. A criança controla a reprodução, enquanto a sequência mantém o controle dos objetos e parâmetros.

**Experimentar gravidade:** o impulso permanece fixo. A criança observa o salto sem gravidade, liga a gravidade e repete. O objetivo é perceber a volta ao chão.

**Experimentar impulso:** a gravidade permanece fixa. A criança muda o impulso dentro do intervalo permitido e compara as alturas. É outro bloco, com outro objetivo.

**Aplicar no projeto:** se fizer parte da aula, o professor acrescenta uma etapa de criação com um objetivo próprio. A conclusão da experimentação não dispara novos desafios ou mudanças livres de parâmetros.

## O professor acompanha

Na demonstração, o registro informa se o roteiro foi acompanhado. Na experimentação, informa quais observações foram produzidas, as pistas usadas e as comparações guardadas. A aplicação continua usando os critérios do projeto. Essas evidências permanecem distintas.

## Ensaio local

Abra [o ensaio navegável](http://127.0.0.1:4319/) enquanto o servidor local estiver em execução. Alterne **Visão do professor** e **Visão do aluno**, escolha uma missão e experimente os dois tipos de bloco separadamente. O ensaio usa os componentes reais, sem registrar progresso de aluno ou publicar aulas.

Para iniciar novamente:

```powershell
cd packages/community-kids
bun tests/visual/serve-experience-preview.ts
```

Os [roteiros e manifestos das 13 aulas](corre-dino-v6/README.md) foram refeitos a partir dos roteiros gravados: 128 seções, 17 demonstrações planejadas em vídeo e 14 experimentos nativos. O guia do curso explica o reaproveitamento dos clipes e as decisões por aula. A biblioteca de demonstrações nativas continua disponível como alternativa de autoria, sem inserção automática.
