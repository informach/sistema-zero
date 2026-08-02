// O cache de `getEnv()` pode ser aquecido por qualquer arquivo da suíte.
// Defina a configuração compartilhada antes que os testes sejam carregados.
process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key'
process.env.GATEWAY_URL ??= 'http://gateway.test'
process.env.MEMBER_SHELL_HMAC_SECRET ??= 'member-shell-test-secret-32-characters'
