# Lote 3 — Testar e revisão de fechamento

Data: 17/11/2026. Base: `staging`, checkpoint `22e5c64dc`. Complementa os recortes anteriores do lote 3, sem alterar as ferramentas dos lotes 4–10. Implantação e validação remotas permanecem no encerramento global.

## Entrega da parte 3.8

O botão **Testar** abre uma sessão temporária no mesmo palco, com primeira pessoa, terceira pessoa e voo. Aceita o boneco de referência ou um personagem escolhido diretamente na biblioteca, mesmo sem existir como objeto no cenário. A escolha não modifica o documento nem concede progresso no jogo. Altura nativa, orientação e clipes são explícitos; a cápsula, os degraus e a câmera acompanham a altura escolhida.

A cápsula consulta as malhas carregadas, com BVH compartilhada por geometria e índice de volumes por instância. Respeita terreno, recortes, espelhos, conjuntos e os tipos nenhuma/caixa/cápsula/malha. O plano decorativo externo desaparece durante o ensaio e não vira chão físico. Fontes pendentes impedem a entrada. Não se escreve `boundsTree` nos modelos da biblioteca.

O passo físico fixo trata gravidade, salto, degraus baixos, rampas e limites reais. A água declarada informa cobertura e nível para flutuação e saída, sem se tornar um piso sólido. O acabamento visual da água e suas ferramentas continuam no lote 5. Esta sessão genérica não substitui Rapier, o controlador ou as regras do Arquipélago; seu perfil fica no lote 8.

Teclado/mouse e controles de toque permitem andar, correr, olhar, saltar e voar. Perda de foco pausa e limpa comandos. A saída restaura posição, orientação, foco, recorte da câmera, grade e fundo da edição. A edição e as capturas automáticas ficam suspensas durante o ensaio. Nova cabeça autoral encerra o teste; downloads do personagem aceitam cancelamento até o armazenamento.

O medidor mostra início/fim, distância direta, distância efetivamente caminhando no chão e tempo ativo. Pausa, voo, nado, queda e retorno ao início não geram caminhada artificial. Não altera o histórico.

## Correções verificadas na revisão

- O apoio inicial podia exibir a pose de salto antes do primeiro passo. A inicialização consulta o contato real e aplica o clipe inicial sem transição pela pose de montagem.
- O transporte autoral do corpo podia deslocar o avatar para fora da cápsula. Apenas cópias dos clipes são tratadas: preservam articulações e balanço da passada, retiram transporte global e sincronizam cadência com a velocidade medida quando há deslocamento autoral.
- A subida de degraus era parcialmente excluída do medidor como se fosse salto. A transposição mantém apoio somente enquanto o patamar real está dentro do alcance; teste vermelho/verde e escadaria da Faísca conferidos.
- Quadros de 200 ms perdiam metade do tempo por um limite adicional de delta. O teste reproduziu a diferença de 1,5 m; o acumulador agora executa todos os subpassos de um quadro aceito, limitado a 250 ms. Suspensão longa continua descartada; animação usa o mesmo intervalo ativo.
- A queda era limitada pela altura inicial, impedindo descidas legítimas maiores que 100 m. O limite agora deriva do fundo real dos colisores; teste de descida de 150 m preserva o piso existente.
- Sombras e névoa acompanhavam o foco antigo da edição. Durante o teste acompanham o personagem; a vista original retorna ao sair.
- Espaço sobre o botão Pausar podia também saltar. Os controles respeitam eventos consumidos e a ativação nativa dos botões; regressão pelo teclado passou.
- Preparação cancelada/falha podia deixar alças desligadas. O encerramento restaura o estado também nesses caminhos. Trocar de controlador cancela respostas antigas.
- O cabeçalho estreito podia esconder a ação principal. Testar aparece primeiro na ordem real dos controles; seis abas textuais continuam no desktop de 1.366 px, com adaptação para 1.024/390 px.

## Prova com o avatar e a Faísca reais

O fixture de QA monta Cute Characters com as mesmas peças, esqueleto e paleta usados pelo projeto. A combinação medida tem **1,17004 m de altura nativa**, próxima da referência de 1,16 m, e quatro clipes: parado, andar, correr e pular. O motor genérico não importa o Arquipélago; essa montagem existe somente no helper de teste. GLBs, catálogo privado e documento-fonte não são versionados.

A cena convertida conserva 523 objetos, 42 referências de modelos e o relevo original por peças de altura. As travessias usam a cápsula e as malhas reais, sem teletransporte entre destinos:

| Percurso | Caminhada medida | Tempo ativo |
|---|---:|---:|
| Reserva da Morada → Praça | 12,66 m | 8,68 s |
| Praça → Horta | 19,76 m | 13,40 s |
| Horta → travessia da Ponte dos Campos, com aproximações | 46,63 m | 30,15 s |
| Praça → patamar do Farol | 35,64 m | 20,56 s |

O retorno da ponte também foi percorrido. A chegada ao Farol está em Y≈9,55 m; distância direta de 31,33 m e caminhada maior, incluindo escadaria. Os valores são de um ensaio e variam ligeiramente com a aproximação. O lote da Morada continua reservado, sem antecipar sua integração. A geografia e os percursos compactos não foram reposicionados.

[Dados dos percursos](evidencias/lote3-testar/faisca-resultados.json), [caminhada em primeira/terceira pessoa](evidencias/lote3-testar/faisca-caminhada.mp4), [movimento do avatar](evidencias/lote3-testar/avatar-movimento.mp4), [reserva da Morada](evidencias/lote3-testar/faisca-morada-terceira.png), [ponte](evidencias/lote3-testar/faisca-ponte-terceira.png), [Farol](evidencias/lote3-testar/faisca-farol-terceira.png).

## Verificação técnica

| Verificação | Resultado |
|---|---|
| Núcleo | 155 testes / 3.954 asserções |
| Motor | 74 testes / 2.620 asserções |
| Oficina e hosts | 67 testes / 446 asserções |
| Members: cenários e publicação de cursos | 66 testes / 302 asserções |
| BFF, endereços e conteúdo | 36 testes / 193 asserções |
| Gateway | 5 testes / 285 asserções |
| Postgres descartável, migrations até 0161 | 35 testes / 314 asserções |
| Tipagem completa Members, member-shell, motor e oficina | Aprovada |
| Build do playground | Aprovado |

O build mantém o aviso de chunk do motor: aproximadamente 819 kB, 219 kB gzip. Não foi suprimido. As verificações são locais; não representam aprovação de desempenho em celulares ou Chromebooks físicos.

Chrome claro/escuro em 1.440, 1.366×768, 1.024 e 390 px: três modos, curva, salto, pausa por teclado, retorno, controles de toque emulado e autoria intacta. Avatar nativo escolhido na biblioteca sem objeto autoral: quatro clipes, caminhada/corrida/curva/salto e primeira pessoa. Formas, rampa espelhada, conjunto girado e água com saída foram percorridos no palco real. Sem erros de página/console.

Em seis ciclos com o avatar real, o renderer retorna de 10 geometrias/10 texturas para as mesmas 4 geometrias/3 texturas da edição. A imagem restaurada da câmera é idêntica; falha de carga, cancelamento e cabeça nova foram exercitados. [Recursos](evidencias/lote3-testar/recursos.json), [física](evidencias/lote3-testar/fisica.json), [interface estreita](evidencias/lote3-testar/interface-terceira-dark-390.png).

Regressões adicionais passaram: biblioteca de conjuntos/publicação/reentrada, alças aceitas/recusadas/canceladas, oito capturas e descarte, retratos/restauração, espalhamento, clipboard entre cenários e conjuntos com iluminação diurna/noturna. Os vídeos e quadros de movimento foram inspecionados como evidência do ensaio, sem promover isso a aceite perceptivo definitivo da animação do jogo.

## Conferência normativa do lote inteiro

| Parte | Implementação e revisão |
|---|---|
| 3.1 — operações de composição | Alinhar/distribuir, repetir, variar, espelhar e trocar modelos; [espelho/troca](revisao-lote3-espelho-troca.md), rotação de mundo testada com referência independente Three |
| 3.2 — encaixes | Grade, origem, giro modular, andares e superfície real; [revisão e travessias](revisao-lote3-encaixes.md) |
| 3.3 — formas e acabamento | Caixa, rampa, escada, cilindro; cor e textura por objeto, repetição física, referências e licenças; [formas](revisao-lote3-formas.md), [texturas](revisao-lote3-texturas-objetos.md) |
| 3.4 — organização | Árvore/pastas, olhos/cadeados, camadas, seleção múltipla/área/laço, clipboard e reentrada; [organização](revisao-lote3-organizacao-selecao.md), [transferência](revisao-lote3-transferencia.md) |
| 3.5 — espalhamento | Semente, prévia real, alturas e um comando por gesto; [revisão](revisao-lote3-espalhamento.md) |
| 3.6 — conjuntos | Definição reutilizável, biblioteca, cópias vivas, editar/publicar explícitos, transações e retratos; [fechamento](revisao-lote3-conjuntos-biblioteca.md) |
| 3.7 — histórico e eficiência | Imagens por revisão, restauração durável, coleta/cota, faixas GPU e consultas espaciais; [retratos](revisao-lote3-retratos.md), [eficiência](revisao-lote3-eficiencia-objetos.md) |
| 3.8 — Testar | Sessão, colisão, três modos, avatar da biblioteca, controle de recursos e medição descritos acima |

Limites deliberados já rastreados: clipboard de águas/caminhos/marcadores será estendido nos lotes 5–7; régua autoral e início persistente pertencem ao 7; perfil do jogo pertence ao 8. Nada disso é apresentado como pronto neste lote.

Este fechamento é técnico e funcional. O gramado, os caminhos, a água e a composição da Faísca nas capturas ainda são a cena importada. Não constituem a composição artística final solicitada, nem aprovação de animação/IK do jogo ou dos marcos de direção de arte. Ferramentas restantes, composição pelas imagens, full review, CI, implantação e prova de staging continuam obrigatórios no trabalho global.
