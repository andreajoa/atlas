import { handleApi, cleanup } from './analytics.mjs';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    if (['/dashboard', '/dashboard/'].includes(url.pathname)) {
      url.pathname = '/dashboard.html';
      const asset = await env.ASSETS.fetch(new Request(url, request));
      const headers = new Headers(asset.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow'); headers.set('Cache-Control', 'no-store');
      return new Response(asset.body, { status: asset.status, headers });
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(controller, env) { await cleanup(env); }
};
