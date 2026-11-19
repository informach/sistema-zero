# Lote 8.3 — Runtime portátil, arquivos e fluxo de exportação

Referência: plano normativo de Claude e `2026-11-18-cenarios-lote8-exportacao.md`. Staging conferida em `2ab6ff947`, limpa. A etapa 8.2 está fechada; somente 8.3 está ativa. Validação remota de implantação no encerramento global.

## Ordem de execução

- [x] Carregar o pacote conferido no Three sem Palco/editor: modelos compartilhados, cópias de esqueletos/clipes independentes, matrizes finais, picking por entidade, colisões e alturas existentes. Falha/cancelamento não entrega cena parcial; descarte idempotente.
- [x] Reutilizar ambiente e água nativos através de entradas resolvidas. Não fabricar documento autoral ou recalcular apoios. Preservar cobertura de nado e fundo dos modelos de água.
- [x] Provar o runtime com os pacotes do ensaio integrado: três ciclos, cancelamento, física, imagens, animações e descarte. Registrar as limitações reais de cada formato.
- [x] Gerar um único módulo JavaScript portátil a partir da fonte TypeScript canônica, com Bun instalado, sem variáveis de ambiente, imports externos ou URLs de sessão. Verificação reproduzível e licenças dos componentes distribuídos. O runtime direto e o arquivo gerado têm a mesma implementação.
- [x] Empacotar Three com ZIP existente do Molda, manifesto, recursos usados, licenças, LEIA-ME e exploração independente. Reabrir sem login em servidor estático.
- [x] Corrigir a leitura ZIP compartilhada: perfil real encontrou 47,6 s na reabertura. [Correção e prova](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-zip-faixas.md): leitura por faixas limitadas, pacote real reaberto em 262,5 ms, conteúdo/CRC/cotas preservados. Não alterou o módulo portátil.
- [x] GLB único conserva composição e animações suportadas, com validação independente. [Revisão, limitações e evidências](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-glb-unico.md).
- [ ] Preparação autorizada da revisão real no Members, contrato equivalente nos hosts memória/HTTP/BFF. Nenhuma permissão confiada ao cliente; salvar pendente bloqueia revisão errada.
- [ ] Fluxo visual nos componentes existentes do Molda: revisão, destino, recursos/limites, licenças nominais, junção, progresso, cancelamento, repetir e baixar. Testar quatro layouts e temas, erros e autoria intacta.
- [ ] Revisar, documentar, commitar e enviar as evidências. Só fechar 8.3 com todo seu escopo; 8.4/8.5 e encerramento global permanecem pendentes.

## Decisões

Os consumidores recebem o pacote compilado, nunca o estado privado do editor. O runtime não implementa regras de campanha, inventário ou um segundo controlador do Arquipélago. O exemplo offline é uma exploração do cenário; o jogo conecta seus sistemas existentes ao mesmo carregador.

Adulto/Kids usam Next.js e o playground usa Vite. Portanto, a distribuição offline não pode depender de módulos virtuais exclusivos do Vite ou caminhos `/@fs`. Usar geração de fonte JavaScript empacotada a partir de uma entrada restrita é compatível com os hosts e segue precedentes de fontes geradas no Estúdio. O artefato deve ser reproduzível, carregado sob demanda e livre de configuração da plataforma.

Um destino que não representa um efeito deve informar essa limitação. Não trocar silenciosamente animação por pose estática ou descartar dependências para caber em orçamento. O pacote Three conserva água dinâmica; o GLB registra sua representação estática.
