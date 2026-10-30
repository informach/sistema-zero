# Coleções da praia e pesca tranquila

**Objetivo:** completar o ciclo de explorar a areia, pescar no píer e consultar as descobertas
no álbum, recorte E01 do programa aprovado de entrega integral.

**Base:** staging `01b36a7f2`. Execução sequencial com writing-plans, executing-plans,
test-antipatterns e verification-before-completion. Worktree próprio. Commit e merge local,
sem push, banco remoto, Blender, GLB, .env ou CI.

## Desenho e decisões

A proposta original descreve conchas e peixes da praia, pesca no tempo certo e ausência sem
perda. Os cinco modelos de conchas, estrela-do-mar, cinco peixes e vara já estão disponíveis.
Reutilizar os modelos e os ícones, sem formas substitutas. A estrela é observada onde está;
os peixes são devolvidos ao mar depois de registrar a descoberta.

Escolha: lembranças únicas no inventário, como o cristal raro. O contrato já admite IDs novos.
Não criar campo, versão ou segunda persistência para uma coleção de onze entradas. Cada
descoberta guarda quantidade 1, não pode ser comida, presenteada nem usada como ingrediente.
O álbum deriva tudo do mesmo save. Uma coleção separada exigiria migração sem necessidade;
localStorage isolado perderia continuidade entre aparelhos.
Na barra de uso rápido, as lembranças são reunidas em um botão para abrir o álbum. O modelo
de inventário continua completo; a apresentação compacta impede cobrir o jogo no celular.

A pesca usa um estado transitório puro: lançar, aguardar 3 segundos ativos e recolher nos
5 segundos seguintes. Clicar antes não penaliza; perder a janela apenas permite tentar outra
vez, sem gastar isca, moedas ou descobertas. Pausa congela o relógio. Sair do alcance cancela
a tentativa. As espécies novas vêm em ordem fixa, sem raridade ou sorte que impeça completar.
Depois de conhecer todas, a atividade continua e não duplica itens. Não introduzir receita
que consuma essas lembranças, nem prometer toda a cozinha de peixes nesta entrega.

Coleta e pesca exigem chão, altura e alcance; o boundary usa a pausa, a política de escrita,
o bloqueio durante visita e o `mudar` existente. O jogo da visita não oferece coletar.
O píer mantém livres a luneta, a chegada do barco e o corredor central. A areia usa posições
fora dos habitantes e das pontes, com teste de terreno e distância. Nenhuma colisão é alterada.

## Entregas

- [x] Catálogo e regras puras em `sistemas/colecoes-da-praia.ts` e `sistemas/pesca.ts`;
  testes de idempotência, pausa, janelas, catálogo/arte, persistência e tetos do save.
- [x] Interativos e desenhos em `mundo/colecoes-da-praia.tsx`, montados na cena central;
  sem alocação no passo da pesca, sem alteração da física ou da política de salvamento.
- [x] Seções de conchas e peixes no álbum existente, com ícones e pistas, usando o tema
  dos dois públicos. Itens protegidos pelo catálogo único.
- [x] Navegador local em computador e celular emulado: coletar, pescar, janela perdida,
  pausa, álbum, reabrir e visita sem coleta. Prints e negativos preservados em docs/qa.
- [ ] Suíte do jogo, tipagem com heap 8192, Biome, build e full review; commit e merge local.

## Limites do aceite

Navegador usa plataforma falsa e modelos reais. Não é aceite hospedado nem medição de FPS
físico. Importação dos desafios do Pega-conchas pertence ao conteúdo C03. Receita de peixe,
caso desejada, precisa de ingrediente consumível distinto das lembranças, em outro recorte.
