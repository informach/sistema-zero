# Fase3-02: mergulho do Recife

## Decisões

- No referencial do Recife: navio em `(18; 0; -30)` e labirinto em `(-1; 0; 27)`, sem giro adicional. A posição inicial do navio proposta pela arte cruzava o corredor de 5 m do barco. A prova contra o volume real encontrou esse conflito; a posição nova mantém os modelos fora do corredor e de todas as pontes. A entrada do labirinto continua voltada para a ilha. A roda de boias passa a 52,6 m apenas no Recife, com folga para os dois modelos e com o corredor do barco já existente.
- O fundo permanece em `-3,5 m`. A leitura dos arquivos confirmou que o piso do porão está em `-3,35 m`: o fundo global não precisa ser removido nem aprofundado. Não deslocar verticalmente os modelos.
- Entrar pela ação de usar junto da âncora `mergulho`, depois da carga completa. O modo usa a mesma cápsula e o controlador livre do contrato dos modos. Espaço ou o botão Subir sobem; Q ou o botão Descer descem; no controle físico, o botão inferior sobe e o esquerdo desce. Soltar os botões mantém a profundidade. A direção continua relativa à câmera.
- Não haverá contador de fôlego nem dano, nos dois públicos. É uma exploração sem pressa. Subir até a superfície encerra o modo; não há retirada de itens, tempo ou progresso. O volume de água tem raio de 48 m e limita a exploração e a corrente suave empurra para dentro na borda, sem transporte através de paredes. Não usar subida automática sob o teto do navio ou da gruta.
- Velocidade horizontal de 2,6 m/s e vertical de 1,4 m/s, aceleração de 6 m/s² e freio de 4 m/s². Passo fixo de 1/60 s. Pausa zera o deslocamento sem avançar a regra. Corrente é somada à velocidade, não ao comando. A água é um sensor, nunca um piso ou parede invisível.
- Câmera próxima, até 3 m, com inclinação baixa e colisão já existente. Sem ondulação, rotação automática ou antecipação; a preferência de movimento reduzido continua valendo. Superfície visível dos dois lados.
- Baú e tesouro concedem uma descoberta permanente no álbum e 15 pontos de diversão cada, uma única vez, respeitando o teto existente. Não criar moeda local, item sem modelo ou recompensa repetível. O baú usa o modelo pronto dos itens; as pérolas já estão no labirinto. A página abre a entrada do Recife no diário. O texto novo é narrativa desta entrega, não uma citação atribuída a uma proposta anterior.
- Salvamento V11 com três marcas booleanas em `recife`. Migrar V10 preservando tudo e iniciando as marcas como falsas. V1 a V10 continuam com os formatos originais. O serviço usa o mesmo contrato e migra a leitura e a escrita. Reabrir durante o mergulho volta à entrada segura, preservando os achados; a posição submersa temporária não é salva. Não há coluna ou migração SQL nova; testar a rota local e o teto de 64 KB com o pior caso completo.
- Carga privada dos dois GLBs e do baú, somente com o Recife ativo. Descartar respostas tardias, parar mixers e liberar geometria, materiais e texturas ao sair. Não usar o cache de uma ilha para buscar três arquivos independentes, pois ele expulsaria o Recife.

## Conferências e entrega

1. Regras puras, modo e controles: entrada, profundidade, corrente, pausa, saída e equivalência entre desenho a 30 e 60 quadros.
2. Contrato V11, migrações, recompensas idempotentes, diário e álbum, teto completo e HTTP com repositório local.
3. Colisores dos arquivos reais, navegação até o baú, página e tesouro, limites de exploração, barco, pontes e boias. Nenhum gerador ou GLB alterado.
4. Playground com SwiftShader em computador e celular emulado: entrar pela ação, nadar, usar os achados, pausar, emergir e sair do Recife. Guardar prints e resultados reais, sem chamar transporte de teste de travessia jogada.
5. Testes completos e tipagem dos pacotes tocados, Biome dos arquivos tocados, revisão do diff, commit, rebase e push em staging.

## Arte

Os arquivos têm as âncoras e os colisores descritos. Não trazem um nó de volume de água. O sensor será definido no jogo a partir dos limites de exploração, como a água existente; não depende de regenerar os GLBs. Se as provas com a cápsula revelarem passagem bloqueada na arte, registrar aqui o nome do colisor, o ponto e a folga necessária antes de pedir correção.

## Estado

Implementação concluída. O percurso completo passou em computador e celular emulado com
SwiftShader, incluindo pausa, achados, superfície, descarte e remontagem. Resultados e limites
em `docs/qa/2026-10-29-mergulho/README.md`. Nenhuma mudança de arte foi necessária.

### Visão nos corredores estreitos

Quando a colisão aproxima a câmera a menos de 1,4 m do centro do corpo no mergulho, só o desenho
do avatar fica oculto, para não mostrar seu interior. Ele reaparece a partir de 1,65 m. Essa
folga evita piscar na borda. A cápsula, a posição, as animações e os comandos não mudam.
A escolha da ilha completa é única nas áreas de carga sobrepostas; durante o mergulho, o Recife
mantém a prioridade até a saída, mesmo que a pessoa se aproxime da área de outra ilha.
