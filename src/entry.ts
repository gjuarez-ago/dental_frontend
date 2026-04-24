export interface Env {
  ASSETS: { fetch: typeof fetch };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Intentamos obtener el archivo real (js, css, imágenes, etc.)
    const response = await env.ASSETS.fetch(request);

    // Si no existe (404) y no parece un archivo estático (no tiene punto en la ruta),
    // devolvemos el index.html para que el Router de Angular funcione.
    if (response.status === 404 && !url.pathname.includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url));
      return env.ASSETS.fetch(indexRequest);
    }

    return response;
  },
};
