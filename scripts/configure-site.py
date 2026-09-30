#!/usr/bin/env python3
"""Set the public origin for the static site's SEO metadata."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape
root = Path(__file__).resolve().parents[1]
if len(sys.argv) != 2:
    raise SystemExit('Uso: python3 scripts/configure-site.py https://seu-dominio.com')
parsed = urlparse(sys.argv[1])
if parsed.scheme != 'https' or not parsed.netloc or parsed.path not in ('', '/') or parsed.query or parsed.fragment or parsed.username:
    raise SystemExit('Informe uma origem HTTPS, sem caminho, parâmetros ou credenciais.')
base = f'https://{parsed.netloc}/'
pages = []
for p in sorted(root.glob('*.html')):
    s = p.read_text(encoding='utf-8')
    if re.search(r'<meta name="robots" content="noindex', s):
        continue
    canonical = re.search(r'<link rel="canonical" href="([^"]+)"', s)
    if not canonical:
        raise SystemExit(f'Canonical ausente: {p.name}')
    previous = urlparse(canonical[1])
    old_base = f'{previous.scheme}://{previous.netloc}/'
    page_url = base + ('' if p.name == 'index.html' else p.name)
    s = re.sub(r'(<link rel="canonical" href=")[^"]+', lambda m: m[1] + page_url, s)
    for prop, value in [('og:url', page_url), ('og:image', base + 'assets/social.png')]:
        s = re.sub(r'(<meta property="' + prop + r'" content=")[^"]+', lambda m: m[1] + value, s)
    s = re.sub(r'(<meta name="twitter:image" content=")[^"]+', lambda m: m[1] + base + 'assets/social.png', s)
    match = re.search(r'(<script type="application/ld\+json" id="structured-data">\s*)(.*?)(\s*</script>)', s, re.S)
    if not match:
        raise SystemExit(f'Dados estruturados ausentes: {p.name}')
    def migrate(value):
        if isinstance(value, dict): return {key: migrate(item) for key, item in value.items()}
        if isinstance(value, list): return [migrate(item) for item in value]
        if isinstance(value, str) and value.startswith(old_base): return base + value[len(old_base):]
        return value
    data = migrate(json.loads(match[2]))
    s = s[:match.start(2)] + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + s[match.end(2):]
    pages.append((p, s, page_url))
for p, s, _ in pages:
    p.write_text(s, encoding='utf-8')
(root / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {base}sitemap.xml\n')
entries = ''.join(f'<url><loc>{escape(url)}</loc></url>' for _, _, url in pages)
(root / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>\n')
(root / 'site-config.json').write_text(json.dumps({'url': base, 'name': 'Atlas Viagem', 'language': 'pt-BR'}, ensure_ascii=False, indent=2) + '\n')
print(f'SEO configurado para {base} ({len(pages)} páginas)')
