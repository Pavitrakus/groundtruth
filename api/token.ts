export async function POST() {
  const apiKey = process.env.REACTOR_API_KEY;

  if (!apiKey) {
    return json(
      {
        error:
          'REACTOR_API_KEY is missing. Add it in Vercel Project Settings > Environment Variables.',
      },
      500,
    );
  }

  try {
    const response = await fetch('https://api.reactor.inc/tokens', {
      method: 'POST',
      headers: { 'Reactor-API-Key': apiKey },
    });
    const body = await response.text();

    return new Response(body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
      status: response.status,
    });
  } catch (error) {
    return json(
      {
        detail: error instanceof Error ? error.message : String(error),
        error: 'Unable to reach Reactor token endpoint.',
      },
      502,
    );
  }
}

export function OPTIONS() {
  return new Response(null, {
    headers: corsHeaders(),
    status: 204,
  });
}

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    headers: corsHeaders(),
    status,
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Origin': '*',
  };
}
