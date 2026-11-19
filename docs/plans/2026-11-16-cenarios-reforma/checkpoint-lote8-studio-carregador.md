# Lote 8.4 — Carregador de cena compartilhado

19/11/2026. Continuação de `620e7e988`, galeria qualificada. **Carregador implementado, testado e revisado localmente; 8.4 continua aberto.** Os quatro motores ainda não chamam este carregador.

## Implementação

`studio/src/three/scene3d.ts` expõe `carregarCena3DDoProjeto(id, assets, sinal, opcoes?)`. A função resolve somente o ID de um asset `scene3d`, verifica os tetos existentes do transporte e materializa o pacote pelo resolvedor de referências já utilizado na validação. Os bytes decodificados, o manifesto e as opções são capturados antes da primeira espera.

O resultado vem diretamente de `carregarCenaNoThree`, do motor canônico: cena/raiz, alturas, colisões, águas, entidades, atores, instâncias, atualização, enquadramento e descarte. A nova entrada pública restrita `molda-cenarios-motor/runtime` aponta ao mesmo arquivo existente. Não foram copiados algoritmos de carregamento, terreno, GLB ou animação; não há editor, autenticação ou fetch no adaptador.

Cancelamento é conferido antes da materialização, depois do carregamento do módulo e antes da entrega. Se o cancelamento chega na microtarefa da entrega, o resultado já criado é descartado. O programa não recebe uma cena parcial.

## Verificação

- Seis testes, 39 asserções: IDs/tipos/referências, conteúdo adulterado, captura de bytes/opções, limites de transporte, cancelamento antes/durante/na entrega e três ciclos de descarte observando geometria/material reais.
- A cena técnica que entrou pela galeria executou no navegador pelo carregador comum: 20 nós, duas águas, três caminhos, quatro clipes e esqueleto de 44 ossos. Os três ciclos consultaram 441 pontos de altura e recorte cada, comparados ao registro do Raylib nativo com tolerância de 1e-6 m. Todas as consultas coincidiram.
- Cada ciclo desenhou 34 chamadas e 35.174 triângulos, com 23 geometrias/20 texturas. Depois de descartar e limpar as listas do renderer, o nível ficou estável em uma geometria/uma textura dos caches do renderer, sem crescimento entre os três ciclos. O descarte final do renderer devolveu ambas as contagens a zero, como no início. As árvores de colisão e os filhos da cena ficaram vazios. [Primeiro ciclo](evidencias/lote8-studio-carregador/ciclo-0.png), [terceiro ciclo](evidencias/lote8-studio-carregador/ciclo-2.png), [recibo](evidencias/lote8-studio-carregador/carregador.json).
- A prova usou uma única instância de Three, com `connect-src 'none'` e imagens locais `data:`/`blob:`; não houve fetch/XHR. O loader canônico já encaminha imagens embutidas de GLB pelo TextureLoader, conservando a política de rede.
- Tipagem integral do Estúdio aprovada. A conferência encontrou duas imprecisões nas provas: a comparação de uma tupla com uma matriz de números e a possibilidade de matrizes de ossos ausentes. As anotações passaram a representar os valores reais, sem cast ou supressão.
- Regressão no Estúdio: 21 testes/102 asserções, incluindo os seis novos; runtime canônico no próprio pacote: sete testes/88 asserções. Cada suíte usa sua configuração original: o teste HTTP do motor depende do fetch nativo, enquanto a suíte do Estúdio usa Happy DOM. Não houve alteração de produção para acomodar o ambiente de teste.
- Biome dos arquivos de código/JSON e `git diff --check` aprovados. GLBs, projetos completos com bytes de arte e outros arquivos privados continuam fora do Git.

O enquadramento mostra uma cena técnica, não uma composição final da Faísca. As medições são contagens desse ensaio, não um benchmark de aparelho físico nem aprovação perceptiva de animação. O teste isolado de conectividade não substitui a futura qualificação de hashes, importmap, sandbox e bootstrap real do iframe.

## Próximo recorte

Transportar os mesmos assets/referências pelo bootstrap e export existentes e empacotar a mesma função para o iframe. Qualificar WebCrypto no sandbox opaco, imports e CSP antes de ligar o Mundo 3D. O importmap legado dos jogos ainda aponta Three 0.180.0, enquanto os pacotes instalam 0.184.0; alinhar a instância do renderer com a do módulo e testar os motores, sem reescrever dependências autorais Pro.

Depois implementar/testar/revisar Mundo 3D, Canvas 3D, Jogo 3D e Jogo 3D Avançado, nessa ordem. Publicação, lotes 9–10, composição final, full review, CI e implantação/validação de staging continuam pendentes no encerramento global.
