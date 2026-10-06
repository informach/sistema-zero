# Personalização de A Chave do Farol

> Execução autorizada pelo responsável em 06/10/2026. Aplicar a proposta da conversa, retirando a escolha de velocidade. Execução por agentes em frentes independentes, conforme writing-plans, com integração e revisão final pelo agente principal.

**Objetivo:** oferecer oito personagens, quatro cenários, quatro barcos, três chaves e quatro pares de faróis, mensagens próprias e escolha da posição da chave; retirar as seções tanto/velocidade e manter movimento em 3.

**Arquitetura:** ampliar os SVGs nativos, seu catálogo compartilhado e os projetos gerados. Nomes das imagens reconhecíveis em português; variáveis personagem/chave/farol/barco continuam estáveis. Preservar aliases das artes antigas para cenas e trabalhos salvos. Manifestos são gerados pela fonte TS, e o PDF pelo JSON e gerador existentes.

**Tecnologias:** TypeScript/Bun, SVG, Python, Blockly, React para a experiência de posição, HTML/Chrome para o PDF.

**Restrições:** preservar trabalho existente no workspace; não publicar nem apagar progresso. Imagens do mesmo tipo têm tamanho e área de contato iguais. Cenários conservam caminho, ponte e mar. Faróis têm versões apagada e acesa na mesma caixa, com porta no mesmo lugar. A personalização permanece após o envio e antes da publicação. Atualizar documentação, roteiro, gerador, manifesto, projeto inicial e caderno juntos.

## Contrato das artes

Exportar FAROL_PERSONAGENS, FAROL_CENARIOS, FAROL_BARCOS, FAROL_CHAVES como listas de nomes de imagens; FAROL_FAROIS como lista de { nome, apagado, aceso }. Os nomes de imagem seguem o formato que o Estúdio persiste: minúsculas, hífens e sem acentos. O catálogo e o caderno usam exatamente esses nomes; a narração usa a forma natural em português:

- Personagens: aventureiro, menina-de-laco, marinheira, menino-de-bone, exploradora-de-chapeu, pirata, mergulhador, robo.
- Cenários: praia-tropical, costa-rochosa, ilha-nevada, noite-na-ilha.
- Barcos: veleiro, barco-de-pesca, lancha, barco-pirata.
- Chaves: chave-dourada, chave-prateada, chave-de-estrela.
- Faróis: farol-listrado-apagado/aceso, farol-de-pedra-apagado/aceso, farol-de-madeira-apagado/aceso, farol-colorido-apagado/aceso (cada estado tem seu nome completo).

Manter aliases antigos em FAROL_ASSETS/FAROL_HITBOXES, fora das listas novas. As dimensões de cada categoria devem corresponder a FAROL_LAYOUT (normalizar a caixa SVG do farol e barco, cujo desenho original pode usar outra escala). Exportar FAROL_POSICOES_CHAVE = [{ nome: 'perto da trilha', x: 211, y: 53 }, { nome: 'na parte de baixo', x: 160, y: 250 }, { nome: 'perto da ponte', x: 280, y: 160 }]. Verificar os pontos visualmente antes da entrega.

## Tarefas

- [x] Artes: criar SVGs coerentes com o pack, atualizar gerador, catálogos e testes de dimensões/contato/silhueta; gerar módulos e revisar a galeria renderizada. Responsável: agente de artes.
- [x] Curso: retirar tanto/velocidade do Dia 1; manter velocidade 3 na montagem. No Dia 3, preservar personalizar para visual, adicionar farol-mensagens, posicao (experiência) e posicionar-chave (aplicação), antes de fecho. Atualizar propostas, roteiros, gerador de manifestos, documentação vigente e conteúdo JSON do mapa. Responsável: agente de conteúdo.
- [x] Integração: incluir catálogo inteiro nos projetos iniciais e concluído, nomes novos, aceitar todos os faróis acesos na verificação, disponibilizar experiência de posição; conferir compatibilidade dos projetos salvos. Responsável: principal.
- [x] PDF: galerias por tipo, pares de faróis, passos e posição; regenerar e revisar todas as páginas. Responsável: principal.
- [x] Verificação: testes significativos de trocas e jogo completo; validadores de arte, manifesto, roteiro e Como Fazer; inspeção real no navegador com teclado e tela estreita. Atualizar plano com evidências e limitações de publicação/gravação. Responsável: principal.

## Evidência esperada

Trocar imagens não muda x/y/w/h ou contato. Farol inicia apagado, visita sem chave não vence, coleta conserva memória, visita com chave acende o par correto e chama o barco. Reinício restaura os objetos. Galerias do mapa usam o mesmo catálogo do projeto. Projetos salvos continuam utilizáveis. Geradores reproduzem o conteúdo versionado.

## Resultado local

O curso tem 20 partes e 19 vídeos planejados. O Dia 1 tem seis partes, com `tanto` e `velocidade` retiradas e seus blocos aposentados explicitamente. O Dia 3 tem oito partes, incluindo escolhas visuais, quatro avisos, pares do farol e posição da chave. O PDF foi regenerado com 27 páginas; as galerias ocupam as páginas 18, 19, 20 e 22, e a personalização vai da página 17 à 24.

A condição de acender aceita os quatro modelos acesos e o alias antigo por `fieldOptions`. O avaliador continua exigindo o sprite farol e o ramo então correto, recusando imagens apagadas. O Admin mostra a lista de valores aceitos. Os projetos iniciais e concluído têm as 27 imagens, e trabalhos salvos recebem as novas escolhas sem perder código ou imagens próprias.

Evidências conferidas:

- 68 testes de projeto, jogo, seletor real de imagens, regras e manifestos: 999 verificações, nenhuma falha.
- 17 testes de silhuetas, dimensões, pares e seletor após os ajustes de tipos: 385 verificações, nenhuma falha.
- Quatro manifestos válidos sem avisos; 19 roteiros de vídeo válidos; Como Fazer válido.
- Importação HTTP do Dia 1 preserva o caderno; importação do Dia 3 conserva critérios, experiência e projeto compartilhado. Ambos os testes passam em memória, sem escrever no catálogo remoto.
- Gerador de arte `--check` aprovado. PDF com fontes, imagens e limites aprovados e 27 páginas renderizadas e revisadas.
- Jogo real no Chrome: teclado no padrão, toque em 360×640 na combinação robô/noite/farol colorido/barco pirata/chave estrela em 160/250. Porta sem chave, coleta, luz, barco, reinício e proporção 4:3 conferidos, sem erros no navegador.
- Experiências: 776 testes core, 165 testes member-shell e 81 testes Admin passaram; mais 10 testes de posição executados na integração final. Chromium passou nos oito testes Farol; após corrigir a quebra de rótulos a 320 px, os três testes da posição passaram novamente. Capturas desktop, 320 e 390 px revisadas.
- Typechecks finais de core, member-shell, Estúdio, members e Admin passaram, todos com saída 0.
- Capturas dependentes do funil regeneradas; o script do caderno usa o identificador estável p8, independente de número de página.

Arte: [galeria](../../../output/artes/farol-personalizacao.png), [cenários](../../../output/artes/farol-cenarios.png), [jogo personalizado](../../../output/artes/farol-combinacao-vitoria.png). Experiência: [celular](../../../output/artes/farol-posicao-celular.png), [desktop](../../../output/artes/farol-posicao-desktop.png). Material: [Mapa da Aventura](../../../output/pdf/desafio-farol-caderno.pdf).

Publicação e gravação: os arquivos locais estão preparados. A importação no catálogo remoto, a substituição do PDF remoto e a gravação dos vídeos novos/revisados são etapas posteriores; nenhum progresso de aluno foi apagado.
