# LG05 — oficina projetada e destinos

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

O perfil inclui schemas de core/src/studio; PNG 6 exige imagem nova mesmo sem mudar o interpretador. Perfil final da candidata: c8b14ec4cb1d032eb41cc4db429dc74481ee790cd236723a62713f7e9c6a69b8. Usar o artefato Linux exato qualificado pelo workflow oficial da staging, conferir fonte, perfil, hash do arquivo e ID/digest da imagem. Nenhuma mutação Cloudflare foi executada até este registro.

Referência anterior: Worker produção 5df90fce-6396-4e52-81e3-ec56f57a7b0c e staging 2b23ad0e-efd7-4ca7-a985-9ce04317cbe3, ambos 100%. Pools Pro/Three produção usam digest 096f5368…c2a1b e staging a384a191…134; cinco saudáveis por pool, sem rollout pendente na leitura inicial. A hipótese de reutilizar a imagem anterior foi invalidada antes de implantar. Preservar bindings, cron, limites, variáveis e catálogo Python.

Leitor causal A: [PR 298](https://github.com/informach/sistema-zero/pull/298), merge main 0a8d77918c3aec8c1409afad81334a3629602e8f, CI 45995595244 aprovado. Na staging seletiva d0cbbaa3a2b44d08c74a4fddb585ffe200e95f38, os treze jobs de validação passaram; deploy-staging do run 45999172917 falhou no Funnel. Members, Auth, Gateway, Hub, Admin, Community e Kids ficaram saudáveis. Os logs do Funnel mostram build com código zero e imagem enviada ao registro, mas o provedor informa falha de serialização da orquestração. Não equivale a workflow de staging aprovado. A próxima rodada deve ser conferida integralmente; nenhuma falha foi contornada.

## Limites conservados

Python projetado não é oferecido; gerador do schema portátil restringe a versão ao contrato Python implementado e mantém os mesmos bytes. Sua distribuição continua na LG08. Renumerar uma folha usada por mapas projetados permanece recusado para preservar referências. Metadados de grupos/objetos importados são preservados; esta entrega não promete todas as ferramentas avançadas de criação de objetos. Aparelhos modestos e mundos gigantes continuam na LG09. Não foram alterados cursos, progresso, Molda Cenários nem catálogo Python.
