# Revisão da implementação — O Jardim Secreto

Revisão local em 28/10/2026. Escopo: organização por postos, proposta aprovada, artes, projetos 2D/3D, avaliação, quiz, contratos de importação, roteiro, ajuda, PDF e documentação. Não é uma declaração de publicação nem de ensaio com crianças.

## Achados corrigidos

| Achado | Correção e evidência |
| --- | --- |
| O primeiro jardim 3D excedia o limite de malhas do carregador e aparecia como objeto substituto. | Geometrias estáticas unidas por material. Projetos portáteis contêm GLBs reais; teste confere todas as malhas dentro do teto de 48 e renderização no Chrome. O modelo experimental não utilizado foi retirado antes da entrega. |
| Proporção do personagem 2D e enquadramento 3D dificultavam a leitura. | Personagem usa proporção quadrada do arquivo original; câmera enquadra a altura real do jardim. Coordenadas editáveis foram simplificadas, sem casas decimais excessivas. |
| Uma declaração de variável, sozinha, não comprova memória. | Regra estrutural liga início falso, alteração na coleta e consulta da mesma informação na decisão. Aceita outro nome, comparação equivalente e condição negada com ramos invertidos. Execução confere os efeitos. |
| Uma posição alterada e depois sobrescrita poderia contar como escolha. | Avaliação considera o último comando de posição aplicável, exige números finitos e mudança em pelo menos um eixo do chão. Altura sozinha não cumpre a variação 3D. |
| Flor 3D abrindo sem coleta passava no teste feito antes do fim da animação. | Teste espera o resultado e verifica também se o clipe de abertura foi solicitado. A variante sem decisão agora falha nesse objetivo. |
| Limite 2D só verificava parte das bordas. | Percurso cobre as quatro bordas e a volta; também exige deslocamento, para um personagem parado não comprovar limite. |
| Reinício usava a identificação interna da tecla, diferente do contrato do executor. | Passo usa `r`, validado antes da execução. Após o sucesso, confere regador disponível e flor fechada em nova partida. |
| O player e o servidor pressupunham demonstração em toda pergunta. | Quiz misto permite a pergunta de escolha de teste sem cena. Correção parcial continua no servidor, sem conceder tentativa, conclusão ou XP; só a entrega integral conclui. |
| As novas cenas e regras precisavam atravessar todos os contratos. | Core, DTOs, domínio, Admin e player atualizados. Importação e reimportação HTTP testadas nas ofertas infantil e adulta, sem recriar IDs. |
| Ajuda e diagramas tinham nomes ou caminhos de paleta imprecisos. | Conferidos contra as definições dos blocos: Colisões, Encostar e bloquear, Criar e trocar aparência e Animação do modelo. PDF e texto vêm da mesma fonte editorial. |
| Inventários e testes ainda esperavam 40 aulas. | Catálogo passa a 42 aulas, incluindo as duas da missão; 40 projetos com envio. O outline histórico do seed foi preservado. |

## Verificação

- Manifestos: 42 válidos, sem dependência de cena nova ou aviso de convenção. Importação de cada aula abaixo do limite real de 2 MiB.
- Roteiros: 235 clipes em 42 aulas, sem erro de ordem, tag ou derivado textual. Voz gravada e escutada é uma etapa posterior.
- Autoria e regressões editoriais: 376 testes passaram, incluindo as quatro verificações de memória/posição. A suíte de aprendizagem do core passou com 1.050 testes.
- Integrações de importação, quiz e jornada: 60 testes passaram. Regressões do avaliador e componentes compartilhados: 76 testes passaram.
- Integração local com staging: a execução conjunta das suítes editoriais, aprendizagem do core, importação, quiz, jornada e componentes compartilhados passou com 1.558 testes, 140.285 asserções e nenhuma falha em 112 arquivos.
- Jardim: todas as etapas passam pelo schema SZIR, roundtrip de código/blocos e classificação básica, sem exceção de paleta mascarando bloco avançado. Entradas não contêm as regras que o aluno precisa montar.
- Navegador: versões corretas 2D/3D passam; sem memória falha na abertura, sem decisão falha no caso sem regador, e sem movimento não comprova os percursos. Nome alternativo da memória funciona. As coordenadas usadas pelo teste de encontro vêm do projeto atual.
- Quiz: quatro perguntas, erro, nova tentativa, comparação opcional e conclusão conferidos nos componentes reais em 1280 e 390 pixels, sem erro de página nem overflow horizontal. As opções têm a mesma aparência antes da escolha.
- PDF: 29 páginas no template dos cursos-base, com Nunito/Baloo 2 e cores reais dos blocos. Conferidas ausência de overflow, imagens/fontes carregadas, texto extraível e renderização de todas as páginas do PDF final.
- Organização: 275 arquivos anteriores preservados; seis PDFs anteriores idênticos; os três JSONs alterados pela movimentação só tiveram caminhos documentais ajustados.

Os testes de TypeScript gerais desta base ainda reportam problemas fora da alteração: `RequestInit.cache` nos clientes Python do core, declaração de importação do CSS do Estúdio, tipos de Bun em testes de apps e uma união de tipos excessivamente complexa no exemplo Reino Zero. Não há erro novo apontado nos componentes ou contratos do Jardim nas verificações realizadas. Não foi feita uma correção ampla desses arquivos alheios ao escopo.

## Limites e produção

O executor não interpreta o significado de qualquer frase livre nem substitui a revisão humana do jogo. Quando o movimento não permite alcançar o alvo, o resultado informa que o teste não terminou; não comprova, por si, defeito na decisão. A ajuda orienta verificar acesso e altura antes da regra da flor.

A autoria está pronta para importar nas aulas reservadas, preservando identidades. Faltam gravar/escutar as falas, produzir/anexar os vídeos, anexar o PDF no ambiente de publicação e publicar o curso. Um ensaio com iniciantes das idades atendidas continua necessário para avaliar compreensão, além do funcionamento técnico.

As instruções e o estado de produção estão no [README](README.md). Os comandos reproduzíveis e as fontes ficam em `docs/aulas-interativas-tecnico/qa/jardim-*` e `recursos/jardim-secreto/`.
