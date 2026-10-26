# Revisão da composição adicional — 26/10/2026

Base revisada `c1957b9db`: concilia staging local `d6982c8fa`, remoto `e39d5ba5b`,
exploração livre de Cadê/Farol e tipografia adulta. Inclui contrato Catalog NOT NULL
preparado anteriormente, depois de retirar escritores antigos e classificar os registros
financeiros. Não inclui alterações não commitadas das outras sessões.

## Achados corrigidos

1. Quiz Farol interpretava IDs literais de alternativas como comportamento físico. A
   demonstração agora mostra a regra real independente da alternativa; correção continua
   no servidor. Resumo sobre esconderijos/Achados só aparece no quiz do jardim.
2. Controles de posição novos usavam range cru e confirmavam números a cada tecla.
   Passaram ao componente compartilhado Medida. Campo numérico não cobre incremento em
   320 px: controles editáveis usam duas linhas.
3. Fixtures de exploração ainda reproduziam percursos guiados antigos. Atualizadas para
   as comparações exigidas, preservando testes de percursos legados.
4. Import Farol agora confere quatro direções e exploração livre. Aviso de interações e
   fixture do juiz passaram a incluir approachSprite.
5. Perfil gerado do executor Python estava atrasado em relação ao Core integrado.
   Regenerado e conferido em Windows e Linux/Bun 1.3.11. Imagem nova testada localmente;
   provas hospedadas da imagem anterior não qualificam automaticamente esta imagem.

## Evidências frescas

| Suíte | Resultado |
| --- | --- |
| Core | 1.613 testes, 82.116 asserções, zero falhas |
| Member Shell | 1.863 testes, 11.717 asserções, zero falhas; delta final 15/139 |
| Members | 1.977 testes, 14.707 asserções, zero falhas; 532 SQL condicionais não executados |
| Admin | 935 testes, 3.920 asserções, zero falhas |
| Kids | 1.618 testes, 9.212 asserções, zero falhas |
| Catalog | 155 testes, 373 asserções; 9 SQL condicionais não executados; contrato SQL 4/31 |
| Runtime focado | 35 testes, 79 asserções |
| Farol no Chrome real | 16 cenários, 33 asserções, positivos |
| Juiz no Chrome real | 4 testes, 21 asserções |
| Quiz / posição / caminhada no navegador | 4 / 3 / 5 cenários positivos, incluindo 320/360/390 px |

Tipagem passou em Core, Shell, Members, Admin, Kids, Community e Studio Runtime.
Diagnósticos anteriores das fixtures/sobreposição foram preservados. Nenhum skip é positivo.

Imagem `sz-runtime-business-scope:phase2-20261026`: smoke não-root/dependências protegidas
passou; seis kits canvas/phaser/three passaram na validação Docker com captura real.
Perfil Linux verificou correspondência Core/gerador/runtime. Avisos de chunk grande do Vite
permanecem avisos, não foram ocultados.

## Operação e limites

Configurações da [Jornada](2026-10-26-creator-journey-activation.md) e do [Clube adulto](2026-10-26-adult-club-seed.md)
foram aplicadas explicitamente nos dois ambientes. Publicar código não importa automaticamente
roteiros/manifestos nas aulas existentes. Alterações editoriais sinalizadas no plano da Jornada
continuam sujeitas à revisão de conteúdo; não se alterou gravação nesta revisão.

Este documento registra qualificação local. CI da composição, publicação da imagem nova,
provas hospedadas e rollout da segunda liberação precisam de seus próprios recibos.

## Conciliação posterior do remoto/local

Depois do primeiro fechamento, entraram `b0d94b1ad` e seu equivalente local `a675d56d3`,
além do layout avatar/quarto (`f8e039ae5`, `144be0164`). A composição `2a5e8f36c`
contém ambas as histórias, sem conflito de conteúdo. Revistos: remapeamento dos anexos
no clone de curso, identidade das artes existentes na conversa do Pensa, orçamento único
de retomada, base durável da substituição de projeto e ajustes visuais dos cosméticos.

Verificações focadas novas: Shell 11/33, Members 11/41, Pensa 7/24, Kids 12/36,
abertura do Estúdio 10/70 casos internos (um wrapper, sem dupla contagem), todos positivos.
Biblioteca adulta: 64 tutoriais em oito coleções válidos, com avisos editoriais de ausência
de imagens e menções comerciais preservados. Nenhum tutorial foi importado no Admin por
esta operação. Perfil do executor continuou exato após essa conciliação; nenhum arquivo
do runtime ou Core Studio mudou entre a imagem qualificada e a composição nova.

## Correções apontadas pelo primeiro CI integrado

O CI `40356514386` encontrou lint nos protótipos de documentação (imports, semântica de
regiões/grupos, tipo dos botões), formatação das capturas JSON históricas e uma interpolação
legada. Corrigidos sem afrouxar regras nem retirar arquivos do lint. As seis capturas JSON
mantêm conteúdo semântico; os modelos dos protótipos passaram em nove testes/62 asserções.

A prova de responsividade media um botão dentro de `details` fechado: no Chromium Linux,
retângulo de layout não prova visibilidade. O teste agora exige visibilidade real e abre o
comparador para medir também seus controles. Cinco cenários, incluindo 320/360/390 px,
passaram localmente com o comparador aberto; a confirmação Linux pertence ao próximo CI.
Não se reduziu a tolerância nem se excluiu esse controle da prova quando visível.

A rodada `40359142639` confirmou que o botão aberto ainda excedia o console de 320 px
no Linux. O botão direto do comparador herdava `white-space: nowrap` do componente base;
agora respeita a largura disponível, quebra o texto e cresce em altura. Uma regressão
adicional com texto de 20 px reproduziu o vazamento localmente antes da correção.
Após o ajuste, os seis cenários de caminhada passaram (incluindo o texto ampliado e
o clique no botão); Biome e `git diff --check` passaram. Confirmação Linux continua no CI.
