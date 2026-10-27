# Verificação de navegação 3D hospedada — 27/10/2026

Na imagem anterior, o jogo correto da Ilha reprovou por indisponibilidade: o personagem não chegava ao alvo no prazo no contêiner de meio vCPU. O mesmo comportamento foi reproduzido em contêiner local limitado. A redução experimental da resolução não resolveu, e duas páginas 3D simultâneas voltaram a falhar; essas alternativas foram descartadas.

O verificador usa pulsos de teclado adaptados ao deslocamento observado, com limite de duração, preservando as entradas e a velocidade do jogo. Só as verificações que incluem navegação 3D usam o novo contêiner dedicado `standard-4`, limitado a 10 instâncias; os demais continuam no `standard-1`. O contêiner maior tem custo maior enquanto ativo e sua concorrência é limitada: acompanhar uso e latência antes de ampliar. A seleção falha fechada se o recurso dedicado não estiver configurado.

Quando o objeto não se move, a reprovação só é registrada se a cena avançou ao menos quatro quadros; sem essa evidência, ou quando houve movimento mas o prazo acabou, continua sendo indisponibilidade do executor. Assim, uma infraestrutura lenta não vira reprovação da criança por simples expiração.

Na configuração experimental de staging, o jogo correto passou os sete objetivos em 42,5 s; o jogo sem movimento foi reprovado nos sete em 43,5 s, com HTTP 200. Uma prova JavaScript de build e validação no contêiner comum também passou. O tempo de verificação continua alto e deve ser medido com outros jogos e computadores; não equivale à homologação de todo o Estúdio. Testes locais cobrem a escolha do contêiner, velocidades diferentes, ausência de quadros e leituras lentas. A imagem e o Worker finais devem ser implantados juntos com o perfil gerado e testados novamente.
