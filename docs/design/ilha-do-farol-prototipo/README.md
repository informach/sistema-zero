# A Ilha do Farol — protótipo para aprovação

Abrir `../a-ilha-do-farol-prototipo.html`. O arquivo incorpora a interface, fontes, Zappy, Three.js e o runtime atual da extensão Jogo 3D. Não precisa de servidor nem de conexão para as cenas. O botão Ouvir utiliza a síntese de voz do navegador, conforme sua disponibilidade; não representa voz gravada.

## Escopo aprovado para prototipagem

Curso novo no Faísca, continuação de A Chave do Farol. Mesma aventura de chave, memória e decisão em um mundo 3D. **Sem certificado.** O encerramento é a construção, conferência e entrega do jogo. Certificados continuam restritos aos cursos indicados pelo responsável: Cadê Todo Mundo e A Chave do Farol.

Conceitos já trabalhados recebem retomada breve e montagem completa. Não repetir suas experiências. Novidades:

1. Ponto de vista: frente, lado e cima; a chave pode estar encoberta sem ter mudado de lugar.
2. Posição: explorar os dois sentidos de x/z no chão e y na altura, inclusive fora da ordem sugerida.
3. Contato: preparar posições, mover o personagem e testar o encontro usando `SZGame3D.collides`, com áreas de contato opcionais.

Os cenários das duas últimas experiências ficam livres de decoração que encubra o objeto. A interface reaproveita SceneWorkspace, SceneConsole, SceneButton, DialogueBlockView, o mascote e o CSS reais da plataforma. As artes da ilha são ilustrativas, feitas com formas da extensão. HTML/CSS da moldura do protótipo não constituem blocos a ensinar no curso. A criação dos objetos e cenas usa Jogo 3D; contornos de inspeção são auxiliares do protótipo.

Todos os controles relevantes ficam acessíveis; descobertas podem ser feitas em outra ordem, repetidas e desfeitas. Voltar à posição inicial mantém descobertas. Recomeçar experiência limpa o ensaio. Trocar de parte abre um novo ensaio (não há persistência no servidor).

As referências visuais vêm de `packages/studio/src/arte/farol-assets.ts`: aventureiro à esquerda, chave na parte superior do terreno, ponte até o farol listrado à direita e veleiro no mar. Os coqueiros têm manchas de vegetação contidas no gramado, preservando a faixa de areia até a água. As pedras usam volumes arredondados e a paleta das pedras de Cadê Todo Mundo (`jardim-sprites.generated.ts`). Os modelos são montados em `models.ts` com primitivas de Jogo 3D.

## Quiz e objetivos

O destaque de ação orienta operações, como mudar a vista ou testar um encontro. Alternativas de perguntas começam com a mesma aparência: nenhuma recebe a cor principal por ser correta. Uma seleção no quiz pode ser destacada para indicar a escolha da criança, independentemente de estar certa ou errada; a correção vem depois do teste.

Quatro questões: ponto de vista, deslocamento no chão, altura/contato e teste de uma posição nova. Escolher, ver a cena, conferir a explicação e tentar novamente. A demonstração tem espera curta antes de avançar. O quiz é autoral/local, sem nota, XP ou submissão real.

Objetivos das três aulas: movimento e posição; coleta e memória; decisão, vitória, reinício e preservação das regras. O seletor de exemplos mostra estados corretos/incorretos e dicas. **Essa conferência é uma simulação explicitamente identificada**, sem editor ou avaliador de projeto real. Enviar meu projeto demonstra a confirmação local, sem enviar dados.

## Reproduzir e conferir

Na raiz do repositório:

```powershell
bun docs/design/ilha-do-farol-prototipo/build.ts
node docs/design/ilha-do-farol-prototipo/verify.mjs
```

O build precisa da pasta `.cache/ilha-do-farol`, criada automaticamente. Fontes dos componentes e do runtime são lidas do checkout atual. O HTML gerado funciona sozinho.

O teste no Chrome percorre as três experiências, desfazer/reinício, eixos em outra ordem e extremos, contato alto/baixo e afastamento, modo ampliado, erro/repetição/conclusão do quiz, os objetivos nas três aulas e as larguras 390/768/1440. Roda com rede offline. Capturas e logs ficam em `.cache/ilha-do-farol/`.

Esta entrega é um protótipo para decisão pedagógica e visual. Não cria o curso no Admin, manifestos publicados, mídia gravada, avaliações 3D em produção, commit ou merge. A implementação do curso será uma etapa posterior à aprovação.

## Projetos editáveis do Molda

`../ilha-do-farol-molda/ilha-do-farol-molda.zip` contém 14 projetos nativos: mar, terreno, ponte, dois coqueiros, vegetação pequena, farol apagado/aceso, veleiro, pedras, aventureiro, chave, bancada e cena completa. A galeria importa o ZIP em **Importar projeto**; cada `.molda.json` também pode ser importado sozinho.

Gerar: `bun docs/design/ilha-do-farol-prototipo/export-molda.ts`. O exportador captura `models.ts` pelo runtime real de Jogo 3D em Chrome, mantém transformações e cores e usa primitivas editáveis do Molda para caixas, cilindros e esferas. Cones e argola viram malhas editáveis. A caixa invisível de colisão do aventureiro vira um grupo sem geometria visual; suas dimensões ficam no mapa de reintegração.

A cena mantém 127 peças visuais e 15.832 triângulos. Para respeitar o limite nativo de 20.000 triângulos, somente a cena completa reduz a subdivisão de esferas e argola. Os projetos individuais preservam as subdivisões originais. As cópias não são vinculadas; o arquivo devolvido define a fonte da futura substituição. Não regenerar os projetos por cima dos ajustes devolvidos pelo autor: guardar os arquivos recebidos separadamente.

O exportador verifica todas as superfícies e passa o ZIP pelos leitores reais do Molda. Para testar a interface, iniciar o playground (`bun run dev` em `packages/molda`) e executar `node docs/design/ilha-do-farol-prototipo/verify-molda.mjs`. O teste importa os 14 projetos, recarrega a galeria, abre pedra/personagem/cena e confere que **Baixar projeto** preserva os dados de autoria. O LEIA-ME do pacote explica a edição e a devolução; `mapa-de-reintegracao.json` registra posições, câmera e contato.
