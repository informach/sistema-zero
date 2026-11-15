# Faísca V2 — M3, primeira passada ambiental do Gate 2

15/11/2026, branch `staging`. Base de composição: `0f00486c0`, com liberação do Gate 1 e ajustes encaminhados pelo usuário. **Estado: implementado para avaliação, sem aceite final de direção de arte.** `/macro` continua separado da campanha e dos dados de conta.

Referências: [desenho de composição](../plans/2026-11-15-faisca-m3-composicao-design.md), [parecer original](./2026-11-15-faisca-m3-parecer-coordenacao.md), [plano executado](../superpowers/plans/2026-11-15-faisca-m3-gate2.md) e [orientações adicionais de equipamentos e qualidade](../plans/2026-11-15-faisca-patins-mochila-qualidade.md).

## O que mudou no cenário

| Trecho | Implantado nesta passada | Continua em estudo |
|---|---|---|
| Praça | Área de convívio junto ao poço; Quadro e descanso fora da passagem; vegetação lateral e manutenção do eixo porta–praça–Farol | Quadro e bancos são carpintaria de referência; não implementam atividades de campanha |
| Três saídas | Rumos para cultivo, oficina e início da descida da Costa; passagem aberta na cerca | Não há aceite humano de reconhecimento sem mapa; a Costa inteira permanece provisória |
| Correio/Pátio | Balcão com encomendas; caixas com selo da coroa; bancada interrompida e oficina lacrada | As construções ainda usam a mesma família do pack; função/silhueta precisam de avaliação à distância |
| Campos/lago | Grupos de vegetação, ponto de pausa, solo das duas aproximações e apoios laterais da ponte | Vegetação e acabamento de margens ainda sujeitos à avaliação artística |
| Farol/encosta | Chegada e pausa de vista, bases assentadas, imagem da torre inteira e repetição noturna | Seis compartimentos continuam volumes de estudo; acesso narrativo não foi implementado |
| Íris | Conserva pipeline, conversa e câmera existentes; posição vertical segue o piso físico | Figurino, lanterninha, jardinagem e rotina narrativa continuam pendentes |

O cenário principal continua usando os mesmos 23 modelos. A Curadoria 01, recebida durante a execução, acrescentou oito GLBs **somente ao ensaio A/B aprovado**, descrito adiante. As repetições usam instâncias; os volumes de carpintaria usam geometria compartilhada por cor. Não foram alterados o avatar, suas velocidades, interfaces Kids/adulta, motores de câmera/controle, contratos de plataforma ou recompensas V1.

## Correções de implantação e profundidade

**Caminhos no próprio terreno.** As faixas anteriores geravam faces acima da função de relevo, enquanto a malha visível/física é uma triangulação de 4 m. Essa diferença podia produzir interseções em curvas de altura. O Gate 2 compõe caminhos e áreas de uso numa textura compartilhada de 2048² aplicada ao material do próprio terreno, usando o mecanismo de extensão de material já presente no projeto. Não há um plano de estrada paralelo, nem correções arbitrárias de Y para cada foto. As interseções dos desenhos são compostas na textura, sem disputar o depth buffer. A textura e os materiais são descartados no ciclo de vida da cena.

Os caminhos principais partem de 2,6 m e os atalhos de 1,7 m, com borda suave; curvas de encontro são arredondadas. São referências visuais, não colisores. Circulação e testes continuam usando o controlador e o chão reais. As áreas de convívio, cultivo, oficina, Costa e chegada têm tratamentos de solo distintos, mantendo respiros no entorno.

**Bases e terreno.** `alturaNaMalhaDoSetor` interpola os mesmos triângulos desenhados e usados pelo Rapier. Os modelos são assentados considerando caixa, rotação e área de contato; bases rígidas e seus colisores compartilham o resultado. Troncos e vegetação natural usam a região da raiz, evitando apoiar a copa como se fosse a base. Pás do moinho acompanham o apoio do corpo, preservando a montagem.

A medição mostrou que apoiar alguns edifícios num pedestal até a cota mais alta da encosta criaria bases desproporcionais. A solução final prepara **três patamares locais**, no correio, vizinho leste e moinho, com transição de 6 m. A mesma alteração de relevo alimenta desenho e física, com a mesma grade e setores existentes. A diferença vertical total das pequenas bases, incluindo 12 cm enterrados, ficou entre 0,145 e 0,215 m no conjunto medido. Não foram alterados o contorno de 520 m, os centros dos distritos, as cabeceiras ou as outras ilhas.

**Circulação.** A verificação foi ampliada para anel, atalhos e ramais. Um trecho do atalho Campos–Pátio passava pelo volume do correio: foi redirecionado junto ao coração habitado. As cercas receberam aberturas nos eixos de passagem e colisão correspondente. O retorno cobre foi ensaiado pelos pontos da rota, sem atravessar caixas para cortar caminho. O lote de 24 × 24 m da Morada permanece livre, inclusive das copas.

**Ponte.** Origem de altura 3,45 m, escala e colisão em malha preservadas. As aproximações aproveitam os trechos de terreno entre os nós de 16 m e a peça de 12,354 m. Apoios ficam nas laterais, fora do piso. O teste inclui entrada pelo sul, retorno pelo norte e corrida.

## Comparativos nas mesmas câmeras

As fotografias de inspeção têm **1280 × 800, FOV 55°, posição/alvo fixos**, definidos em [faisca-vistas.tsx](../../packages/arquipelago/playground/faisca-vistas.tsx). O antes foi registrado antes das alterações ambientais, com o mesmo avatar disponível no catálogo atual. Uma falha inicial do cache local das animações foi corrigida preparando exatamente o arquivo que o catálogo já referencia; as capturas com erro foram descartadas e repetidas.

`?vista=<nome>` é ferramenta de fotografia: não troca a câmera normal da exploração e não grava esse posicionamento no salvamento do ensaio. As imagens ocultam apenas ferramentas de QA e nomes de estudo, sem esconder modelos, mudar a lente no depois ou retocar a imagem. Antes/depois mostram a mudança real de terreno e composição. Os vídeos abaixo registram também o enquadramento normal.

### Da futura porta e da praça

| Antes | Depois |
|---|---|
| ![Porta antes](./2026-11-15-faisca-m3-gate2/antes/porta.png) | ![Porta depois](./2026-11-15-faisca-m3-gate2/depois/porta.png) |
| ![Praça antes](./2026-11-15-faisca-m3-gate2/antes/praca.png) | ![Praça depois](./2026-11-15-faisca-m3-gate2/depois/praca.png) |

A posição `(0,150)` representa a futura porta; a Morada não foi integrada. A malha de reserva do lote continua visível como estudo.

### Entrada da Costa e Pátio

| Antes | Depois |
|---|---|
| ![Costa antes](./2026-11-15-faisca-m3-gate2/antes/costa.png) | ![Costa depois](./2026-11-15-faisca-m3-gate2/depois/costa.png) |
| ![Oficina antes](./2026-11-15-faisca-m3-gate2/antes/oficina.png) | ![Oficina depois](./2026-11-15-faisca-m3-gate2/depois/oficina.png) |

O lacre e as peças paradas comunicam interrupção; não representam a oficina restaurada nem conclusão da Missão do Núcleo.

### Farol inteiro, subida e noite

| Antes | Depois |
|---|---|
| ![Farol inteiro antes](./2026-11-15-faisca-m3-gate2/antes/farol.png) | ![Farol inteiro depois](./2026-11-15-faisca-m3-gate2/depois/farol.png) |
| ![Subida antes](./2026-11-15-faisca-m3-gate2/antes/subida.png) | ![Subida depois](./2026-11-15-faisca-m3-gate2/depois/subida.png) |
| ![Farol à noite antes](./2026-11-15-faisca-m3-gate2/antes/farol-noite.png) | ![Farol à noite depois](./2026-11-15-faisca-m3-gate2/depois/farol-noite.png) |

### As duas cabeceiras da ponte

| Antes | Depois |
|---|---|
| ![Ponte pelo sul antes](./2026-11-15-faisca-m3-gate2/antes/ponte-sul.png) | ![Ponte pelo sul depois](./2026-11-15-faisca-m3-gate2/depois/ponte-sul.png) |
| ![Ponte pelo norte antes](./2026-11-15-faisca-m3-gate2/antes/ponte-norte.png) | ![Ponte pelo norte depois](./2026-11-15-faisca-m3-gate2/depois/ponte-norte.png) |

## Movimento para avaliação posterior

Os MP4 são arquivos versionados; no GitHub podem ser abertos/baixados pelo arquivo bruto. Usam o controlador real, câmera de jogo e zoom permitido pelo próprio controle, sem teleporte durante o trecho gravado. A preparação inicial usa apenas estado local de ensaio e fica fora do recorte do vídeo. O enquadramento normal, em movimento, complementa as fotografias de inspeção.

| Vídeo | O que observar |
|---|---|
| [Referência, 21 s](./2026-11-15-faisca-m3-gate2/videos/ritmo-referencia.mp4) | Caminhada, corrida, curva, salto, retorno e parada |
| [Exploração, 21 s](./2026-11-15-faisca-m3-gate2/videos/ritmo-explorar.mp4) | Os mesmos comandos no perfil 1,5/3,4 m/s |
| [Ágil, 21 s](./2026-11-15-faisca-m3-gate2/videos/ritmo-agil.mp4) | Comparação experimental, não velocidade final aprovada |
| [Ponte, 27 s](./2026-11-15-faisca-m3-gate2/videos/ponte-ida-volta.mp4) | Piso, entradas, retorno, corrida e câmera |
| [Encosta, 30 s](./2026-11-15-faisca-m3-gate2/videos/encosta-retorno.mp4) | Caminhada com relevo e câmera; o log registra também o circuito/retorno posterior |
| [Descida do Farol, 30 s](./2026-11-15-faisca-m3-gate2/videos/descida-farol.mp4) | Volta pela colina até a praça |
| [Conversa com a Íris, 20 s](./2026-11-15-faisca-m3-gate2/videos/iris-conversa.mp4) | Aproximação/enquadramento, pausa da rotina e saída da conversa |

Vídeos não aprovam automaticamente contato dos pés, IK, cadência, conforto ou prazer de exploração. A Íris ainda é o estudo anterior; o vídeo não representa figurino ou rotina de jardinagem concluídos.

## Verificação técnica

Suíte do pacote com Curadoria: **2.114 testes aprovados, 1 pulado, 0 falhas**, em 246 arquivos (195,92 s). A integração Postgres de tempo exige banco descartável e foi pulada por ausência da variável. Os testes com clipes privados reais foram executados. Tipagem e build passaram. Uma atualização paralela do avatar foi incorporada à `staging` durante a execução; os verificadores foram repetidos com seu catálogo e cache atuais. O resultado final está registrado abaixo.

**Repetição final sobre `63c96dcb6` e as alterações deste marco:** 2.119 aprovados, 1 pulado, 0 falhas, em 247 arquivos (213,98 s); tipagem e build `20261115193539` aprovados, 188 arquivos e 49,13 MB. O cache local foi recomposto com os utilitários de preparação existentes, a partir do commit exato do catálogo `f9e4405e`, e seu digest foi conferido (`animacoes-do-jogo.59d7d6813089.glb`). A tentativa com cache desatualizado falhou explicitamente com HTTP 404 e não foi aceita como evidência. O plano de mochila registra também o novo pipeline de costas/planador, preservado nesta passada.

Os testes novos verificam interpolação contra vértices/triângulos reais, cobertura e altura das bases, passagem dos volumes, proteção do lote contra copas e rejeição de retomada sob os apoios. Os testes de caminho cobrem também anel/atalhos, não só as rotas cotidianas. No navegador, caminhada/corrida casa–praça mantiveram a comparação: 12,5 s na referência, 7,8 s a pé no perfil Exploração e 3,5 s correndo, com controlador real e pausa conferida. São ensaios locais, com os modificadores de humor e limiares de chegada já documentados no V2.

Toque emulado, pulo, conversa, mapa e recuperação de falha parcial HTTP 503 passaram. As capturas não registraram exceções JavaScript ou erro de compilação de shader. O vídeo do retorno cobre e os três ciclos de recursos complementam o teste de colisão/retomada; os registros ficam junto às evidências.

Os verificadores de vídeo usam tempo de parede para alguns comandos. Concorrência pesada de testes e navegadores pode encurtar o deslocamento simulado durante uma espera fixa; os percursos e recursos devem ser repetidos com o navegador de ensaio isolado. Isso não é certificação de aparelho físico nem evidência de FPS sob todas as cargas.

A investigação dos contadores encontrou também uma condição incorreta no verificador anterior: ele tratava uma **queda** de geometrias como crescimento, por aplicar valor absoluto à diferença. Na repetição observada, a contagem caiu de 121 para 118, com 24 setores nas duas amostras, e o teste acusou crescimento. A condição passou a conferir o crescimento assinado, mantendo o limite existente de duas unidades e a exigência de descarregar texturas ao afastar. Cada ciclo agora registra seus contadores para diagnóstico; isso não altera o carregador nem dispensa a comparação. Os totais refletem também o que chegou a ser desenhado e a câmera; não medem a memória inteira do processo.

Na execução final dos três ciclos, as amostras próximas registraram **119/118/119 geometrias e 42/42/42 texturas**, contra **75/78/78 e 33/34/34** à distância. Perto da praça foram observados 58–60 FPS, 85–87 chamadas e cerca de 143 mil triângulos neste Chrome desktop. São amostras locais sem certificação de dispositivos físicos ou perfil completo de memória. [Recursos](./2026-11-15-faisca-m3-gate2/evidencias/recursos.json), [toque e recuperação](./2026-11-15-faisca-m3-gate2/evidencias/toque.json), [ritmo](./2026-11-15-faisca-m3-gate2/evidencias/ritmo.json) e [juntas do caminho B](./2026-11-15-faisca-m3-gate2/curadoria/curadoria.json) estão versionados. Os oito vídeos H264 de 960 × 600 e os arquivos PNG/links foram conferidos; [manifesto de integridade](./2026-11-15-faisca-m3-gate2/evidencias/arquivos.json).

## Curadoria 01: comparação com modelos reais

O usuário aprovou expressamente o ensaio A/B após a entrega da [especificação artística](../plans/2026-11-15-faisca-m3-curadoria01.md), preservada sem edição. A regra é Adventure Land primeiro quando função, escala e composição são adequadas; outras coleções do acervo quando cumprem uma função distinta ou o equivalente não se encaixa. A pintura provisória acima não substitui o teste obrigatório dos módulos do catálogo nem constitui uma nova coleção artística final.

A [auditoria de 17 IDs](../plans/2026-11-15-faisca-m3/curadoria01-auditoria.json) confirmou a existência das peças nos commits `7816a7a` e `4b7ab31` e a igualdade dos GLBs por SHA-256. O exportador conservou o pin original; os oito novos candidatos são `arvore_04_pacote`, `arbusto_04_pacote`, `folhagem_01_pacote`, `cerca_02_pacote`, `barril_01_pacote`, `casa_02_pacote`, `caminho_terra_reto` e `caminho_terra_curvo`. O cache completo soma 11,11 MB; o carregamento padrão continua limitado aos 23 modelos originais. As peças de ensaio só são requisitadas com `?curadoria=a|b`.

O recorte no campo aberto tem **26,5 m**: duas retas de 7 m, curva de raio 3,5 m e outra reta de 7 m. As pontas dos GLBs coincidem usando os encaixes catalogados; não houve estiramento nem alteração das âncoras aprovadas. A bancada é um teste separado de montagem/material, não a aplicação final do traçado Praça–Horta. A escolha será levada ao trecho real depois da avaliação.

- [A, câmera de jogo](http://127.0.0.1:4530/macro?curadoria=a): referência de chão provisório.
- [B, câmera de jogo](http://127.0.0.1:4530/macro?curadoria=b): módulos reais do Reino e colisão em malha.
- Mesma vegetação/objetos Adventure Land nos dois casos, inicialmente em tamanho nativo; a casa de cor diferente usa a mesma escala de referência de vizinhos (0,45).
- A opção B não recebe a pintura da faixa A. O terreno continua como apoio; a superfície caminhável vem do GLB, com cerca de 0,12–0,15 m de elevação e juntas verificadas pelo controlador.
- Os modos A/B iniciam em estado de prova e não gravam posição/visitas sobre o ensaio principal. Nenhuma recompensa ou conta é envolvida.

| A — referência | B — catálogo |
|---|---|
| ![Curadoria A dia](./2026-11-15-faisca-m3-gate2/curadoria/a-dia.png) | ![Curadoria B dia](./2026-11-15-faisca-m3-gate2/curadoria/b-dia.png) |
| ![Curadoria A noite](./2026-11-15-faisca-m3-gate2/curadoria/a-noite.png) | ![Curadoria B noite](./2026-11-15-faisca-m3-gate2/curadoria/b-noite.png) |

[Vídeo de caminhada pelas peças reais, 35 s](./2026-11-15-faisca-m3-gate2/videos/curadoria-caminho-real.mp4). O conjunto preserva o enquadramento normal, a mudança de câmera por obstrução e as juntas reais. O arbusto de 2,23 m e a árvore de 4,216 m são avaliáveis junto ao avatar; não foram encolhidos para fingir equivalência com bordas baixas. O raio do colisor inferior da árvore foi aferido pelos vértices do GLB abaixo de 1,16 m, separado da copa.

O lago navegável de 10,758 × 7,973 m foi auditado, **não implantado**. A elipse física atual e a única superfície de água do lago foram preservadas. Comparar a linguagem da água Adventure Land com a alternativa de lago completo permanece uma decisão própria, com abertura do chão, margem, render e nado testados juntos. Não há dois lagos sobrepostos.

## Equipamentos e próximos aceites

**Patins e mochila foram incorporados ao planejamento e à investigação de contratos, não ativados nesta passada ambiental.** A [orientação detalhada](../plans/2026-11-15-faisca-patins-mochila-qualidade.md) registra descoberta opcional, ID existente, preservação de inventário/conquistas, velocidade 1,3×, perfis experimentais e ensaio sem conta. Registra também a bolsa candidata `costas_bolsa_saco`, o encaixe `costas`/`Spine1` e o conflito com capas no slot atual. A mochila universal, a matriz de clipping, o esconderijo final e os vídeos de patins ficam no recorte separado, sem encobrir pendências ambientais.

Este Gate 2 entrega uma primeira passada montada e ensaiada, não uma ilha concluída. A revisão deve apontar o que preservar e o que ajustar nas imagens e no movimento, especialmente função das fachadas, naturalidade de vegetação/margens, acesso às construções e hierarquia visual da praça. Peças de referência não são acabamento final. Reconhecimento das três escolhas por crianças, ausência de clipping da futura mochila, desempenho em celular/Chromebook físicos e aceite artístico continuam **não testados/não concedidos**.

Nenhuma coordenada V1 foi migrada; nenhum dado compartilhado, item real, conquista ou recompensa da plataforma foi modificado. A sequência narrativa permanece: posto libera a Missão do Núcleo; só o Núcleo instalado no Farol reconstrói a ponte. A reconstrução administrativa do ensaio não concede campanha. Não houve deploy.
