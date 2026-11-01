/**
 * Qualquer outra rota que a aula do Kids chame (o registro de erro do navegador, a telemetria
 * do primeiro acesso, a avaliação do curso): no palco ela é aceita e esquecida. Leituras que o
 * palco não tem respondem 404, e a tela do Kids já sabe lidar com a falta delas.
 */
export function POST(): Response {
  return Response.json({})
}

export function PUT(): Response {
  return Response.json({})
}

export function GET(): Response {
  return Response.json(
    { error: { code: 'NOT_FOUND', message: 'Não existe no palco.' } },
    { status: 404 },
  )
}
