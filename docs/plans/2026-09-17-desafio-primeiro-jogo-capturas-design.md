# Capturas atuais do Desafio do Primeiro Jogo

## Objetivo

Atualizar a página de oferta com imagens que representem a experiência atual do comprador do
Desafio do Primeiro Jogo. As capturas devem mostrar somente o conteúdo e as funções liberadas por
essa compra, sem sugerir acesso à Comunidade do Criador ou às ferramentas vendidas separadamente.

## Decisão

Usar uma fixture visual local e reproduzível. Ela monta componentes reais da plataforma com dados
fictícios derivados dos manifestos em `docs/aulas-interativas/desafio-primeiro-jogo-v6` e dos
projetos progressivos em `docs/aulas-interativas/qa/desafio-projetos-qa.ts`.

A fixture fica em `packages/community-kids/tests/visual`, fora das rotas de produção. Nenhum mock,
perfil ou dado promocional será publicado no aplicativo. Um script de captura abre o ensaio local,
espera fontes e componentes estabilizarem, desliga animações e grava imagens WebP determinísticas
na pasta pública do funil.

## Conteúdo mostrado

1. A introdução e os cinco dias organizados em uma trilha.
2. Uma aula dividida em etapas curtas, com progresso visível.
3. Uma experiência interativa que prepara o conceito antes da programação.
4. O Estúdio dentro da aula, com os blocos permitidos e o jogo ao lado.
5. A evolução do mesmo projeto até a versão final de Nave contra Asteroides.
6. A entrega final e a possibilidade de compartilhar o jogo, que só aparece na última etapa.
7. O Caderno do Aluno e o Mapa dos Pais como materiais complementares do curso.
8. O certificado emitido após a conclusão das etapas necessárias.

Não entram Mural como comunidade, Clube, Pensa, Pinta, Molda, Estúdio livre, outros cursos ou
recursos de assinatura.

## Mudança na oferta

A seção "Olha por dentro" deixa de depender de um print alto e antigo. Ela passa a explicar a
jornada com imagens atuais e legendas que ligam cada função a um benefício observável para os pais.

A seção "O que está incluído" será alinhada aos entregáveis confirmados do produto: trilha,
orientações, experimentos, Estúdio guiado, publicação do jogo, Caderno do Aluno, Mapa dos Pais e
certificado de conclusão. A ausência de um item no manifesto técnico das cinco aulas não será usada
para excluir materiais complementares cadastrados separadamente no curso.

## Regras visuais e de copy

- Captura desktop com enquadramento legível dentro da largura da página de oferta.
- Nenhum nome, e-mail, foto ou identificador real.
- Texto dirigido aos pais, com exemplos concretos do que a criança vê e faz.
- Sem travessões na copy pública.
- Sem prometer melhora de notas, atenção, comportamento ou redução de tempo de tela.
- Arquivos abaixo da dobra usam carregamento tardio e dimensões explícitas.

## Plano de implementação

1. Estender o ensaio visual existente do Desafio com cenários de trilha, aula, experiência e
   Estúdio, sempre usando componentes de produção e os manifestos v6.
2. Criar um capturador determinístico e um comando de pacote para regenerar as imagens.
3. Gerar, inspecionar e otimizar as imagens finais.
4. Atualizar a estrutura, os benefícios, as legendas e os textos alternativos da oferta.
5. Adicionar testes de contrato para manter os entregáveis confirmados e impedir referências às
   imagens antigas da plataforma.
6. Rodar testes, análise estática, typecheck, build e uma revisão final do funil.

## Como regenerar as capturas

Na raiz do pacote `packages/community-kids`, execute:

```sh
bun run capturar:desafio-oferta
```

O comando abre somente a fixture local, captura os cenários e atualiza os arquivos WebP em
`packages/funnel/public/img/desafio-primeiro-jogo`. Ele não usa banco, login ou dados de staging.
