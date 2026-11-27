# LG05 — oficina projetada e destinos

**Estado atual — 27/11/2026, 16:13 UTC:** candidata `75d2d00f535a4e901d0e4d238c45919c1f504a92` no PR 299; staging seletiva `e7aab3f43e3f5bcce5ad8cd4a6fabf7ac0a99300`. Imagem Linux oficial qualificada e copiada ao registro sem reconstrução; manifesto comprimido `sha256:f2b8dd741331e713027e55b5c6d614bed1629041c124dd6f15671b8ac7a90449`, configuração e camadas originais conferidas. Simulações dos dois Workers aprovadas, apontando para os quatro pools existentes com nomes explícitos. Leitura remota: pools saudáveis, vínculos, variáveis, cron e limites preservados. Ainda não houve implantação Worker/imagem, nem nova promoção Railway de produção. CI do PR `46025504124` e da staging `46022790220` recusaram a criação de autorregra isométrica por toque: sete dos oito casos passaram, assim como 16/16 destinos. Windows passou em ambos. Reproduções isoladas em Windows e Linux passaram; causa ainda não comprovada. Coleta de ponteiros, estado da regra e artefatos sendo ampliada. Ativação do único gravador público 8/teto 9 preparada e aprovada nos testes de conta e host (2 testes externos, 4 expectativas); a fonte pública foi restaurada e continua 7/8 até implantar os leitores compatíveis. Nenhum post de QA foi criado.

A coleta ampliada de diagnóstico passou no ensaio de toque e nos tipos do Estúdio. CI novo do PR `46031189795` em execução; configuração `46031189760` aprovada. CI staging `46031230402` aguarda a rodada anterior finalizar; preflight SSH `46031230451` aprovado. A etapa projetada passou para antes dos testes longos Chromium, sem retirar verificações. A pasta de resultados agora integra o artefato de diagnóstico. Reproduções adicionais: sequência original 8/8 em Linux com Playwright 1.64.1; caso isométrico isolado também aprovado em Linux com 1.65.1/Chromium 159, correspondente à versão do CI. Essas aprovações locais não explicam nem anulam a recusa remota.

Diagnóstico remoto `46031189795`, artefato `15214463012`: canvas 262 → 282 px; área da regra 10/7, gesto antigo pintou 9/6 e guardou entrada/saída vazias. Causa no ensaio: reutilização da coordenada em pixels após mudança de layout. Reprodução mínima Linux com aumento de 20 px falhou com o gesto anterior (exit 1) e passou com o toque no centro atual (exit 0). O ensaio comum agora usa o gesto recalculado pelo locator, toque real no projeto touch, resize explícito e comparação da casa e dos valores da regra; mesmos requisitos de prévia/aplicar/reabertura. Nenhum limite ou código de produto foi alterado por essa correção. Matriz corrigida aprovada: oito casos desktop/toque em Windows/Chrome e oito em Linux/Playwright 1.65.1/Chromium 159, ambos em 1,5 minuto, com resize e valores da regra conferidos. Nova rodada CI integral e implantação ainda pendentes.

Os registros datados abaixo preservam a sequência e hipóteses substituídas; este estado prevalece.

Recibo de preparação em 27/11/2026. **Ainda não é liberação pública:** leitor causal 8, escritor público 7 e teto nativo 8. A ativação depende dos leitores e da imagem compatível implantados, seguida de uma promoção separada do escritor 8/teto 9.

## Implementação em qualificação

- Catálogo único da oficina para mapas ortogonais, isométricos e hexagonais. Histórico, salvamento, memória, dependências, recuperação e cópias usam as autoridades existentes.
- Pintura/borracha, coordenadas próprias, seleção integral, copiar/colar, camadas existentes, transformação hexagonal, teclado e toque. Livros usam o mesmo avaliador e painel de autorregras; exemplos de regras hexagonais recusam transformações que o formato do livro não representa.
- O gesto atualiza a autoridade comum durante a pintura, registra um único desfazer e termina antes do flush de ocultação. Uma regra armada permanece prévia até aplicar.
- PNG 6/cena 5 usa o mesmo parser limitado e prova de bytes do PNG 5. Biblioteca, ponte, construtor de jogos, build Classic/Pro e atualização conservam a projeção. Livro permanece no documento editável; o pacote de execução contém a cena preparada.
- Um preparador de cenas e adaptadores de destino. Retirados emissor Phaser antigo, exemplo Pygame sem consumidor e trinta ramificações antigas do construtor Godot. Leitores e migrações anteriores continuam necessários à recuperação.

## Evidência observada

| Prova | Resultado | Limite |
| --- | --- | --- |
| Editor Chrome desktop e toque | 8 casos aprovados | Mesmo computador; não qualifica aparelho móvel físico |
| Destinos no navegador | 16 casos aprovados, 58,1 s | Inclui controle PNG 5, PNG 6 nas duas projeções em Classic/Pro, Jogo 2D/Avançado e botão real Jogar |
| Publicar e atualizar | Quatro casos Classic com BFF/comandos reais; mesmo publicationId/link, player executa PNG atualizado | Hub e R2 controlados; nenhum post remoto |
| Conta/recuperação causal | Três variantes nativo 9 aprovadas na entrega A | [Recibo A](2026-11-27-lg05-leitor-compativel.md); não atribuir ao escritor público ainda desativado |
| Core, Bun 1.3.11 | 3.372 aprovados; 214.402 expectativas; zero falhas | Comando oficial completo |
| Tipos | Member Shell, Pinta e Estúdio aprovados | Árvore isolada a partir de main |
| Gerados | Perfil, player Phaser e schema Python conferidos | Bun 1.3.11; nenhum byte novo de runtime Python |
| Aulas protegidas | Cinco aprovadas; sete objetivos do Farol aprovados | Chrome; guardas de aulas: 891 aprovadas |
| Contrato Pro | Quatro aprovados, 23 expectativas | Três casos reais de imagem condicionais localmente; CI Linux obrigatório |

O editor prova importar → pintar → desfazer/refazer → salvar → fechar/reabrir → biblioteca → backup → restaurar em contexto vazio. Células, projeção, livro e referências são comparados. O ensaio interrompe o gesto depois de observar o checkpoint durável. A criação pela interface prova antes/depois da regra, borracha, prévia sem gravação e aplicação explícita com reabertura.

Regressões reproduzidas e corrigidas: gesto somente em RAM; construtor de jogos tratando células esparsas como array legado; escritor hexagonal admitindo o bloco 1.025, também na soma de camadas. O teto continua 1.024 blocos UInt32/quatro MiB, com recusa atômica. Godot reimporta ambos os mapas pelo codec canônico e preserva os SHAs dos scripts atuais após retirar o emissor antigo (quatro testes/60 expectativas).

## Imagem e sequência de implantação

O perfil inclui schemas de core/src/studio; PNG 6 exige imagem nova mesmo sem mudar o interpretador. Perfil após regenerar também os carregadores 3D oficiais: a27f45d08088a57e72f2283d7965c3a0493d4ef3eded8a78dd2b8a3bbe2723e7. Os perfis anteriores abd210… e c8b14… são intermediários, nunca implantados. Usar o artefato Linux exato qualificado pelo workflow oficial da staging, conferir fonte, perfil, hash do arquivo e ID/digest da imagem. Nenhuma mutação Cloudflare foi executada até este registro.

Referência anterior: Worker produção 5df90fce-6396-4e52-81e3-ec56f57a7b0c e staging 2b23ad0e-efd7-4ca7-a985-9ce04317cbe3, ambos 100%. Pools Pro/Three produção usam digest 096f5368…c2a1b e staging a384a191…134; cinco saudáveis por pool, sem rollout pendente na leitura inicial. A hipótese de reutilizar a imagem anterior foi invalidada antes de implantar. Preservar bindings, cron, limites, variáveis e catálogo Python.

Leitor causal A: [PR 298](https://github.com/informach/sistema-zero/pull/298), merge main 0a8d77918c3aec8c1409afad81334a3629602e8f, CI 45995595244 aprovado. Na staging seletiva d0cbbaa3a2b44d08c74a4fddb585ffe200e95f38, os treze jobs de validação passaram; deploy-staging do run 45999172917 falhou no Funnel. Members, Auth, Gateway, Hub, Admin, Community e Kids ficaram saudáveis. Os logs do Funnel mostram build com código zero e imagem enviada ao registro, mas o provedor informa falha de serialização da orquestração. Não equivale a workflow de staging aprovado. A próxima rodada deve ser conferida integralmente; nenhuma falha foi contornada.

## Limites conservados

Python projetado não é oferecido; gerador do schema portátil restringe a versão ao contrato Python implementado e mantém os mesmos bytes. Sua distribuição continua na LG08. Renumerar uma folha usada por mapas projetados permanece recusado para preservar referências. Metadados de grupos/objetos importados são preservados; esta entrega não promete todas as ferramentas avançadas de criação de objetos. Aparelhos modestos e mundos gigantes continuam na LG09. Não foram alterados cursos, progresso, Molda Cenários nem catálogo Python.

Rodada canônica final da implementação: Pinta 3.024 aprovados/18 condicionais/zero falhas (36.058 expectativas); runtime 442 aprovados/56 condicionais/zero falhas (4.691 expectativas); tipos do runtime aprovados. Candidata isolada 4fc70d1ef1ed0bac4c7e393e5afff05cde9915de no PR 299; staging seletiva 8d65e23d7cd44e63473f363f0ea796e92fa084ea. CI do PR 46019699444 e imagem staging 46020040316 recusaram a rodada: consumidores de homologação ainda esperavam o pacote antigo e o carregador 3D gerado precisa acompanhar o leitor comum. Provas estão sendo migradas para o único pacote novo; a imagem ainda não foi qualificada nem implantada.

Após migrar os consumidores: Pygame-ce 2.5.7 real aprovou igualdade byte a byte dos pixels do PNG anterior com o pacote novo, 18 camadas/duas folhas, colisores e portas nos dois sentidos. A comparação fixa o mesmo tempo decorrido nos dois leitores. A animação da versão capturada e as referências também passaram; 16 casos de geometria, 120 conferências dos PNGs 1×/2× e o Jogo emitido aprovaram pouso e movimento sem plataforma. São provas dos leitores/adaptadores existentes, sem promoção do catálogo Python. Godot mantém a admissão e os scripts atuais já qualificados por SHA; a execução opcional no motor real não foi realizada nesta máquina.
