"""Check crawlable pages, internal links and public-domain migration without dependencies."""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags, self.ids, self.links = [], [], []
        self.feed(text)
        match = re.search(r'<script type="application/ld\+json" id="structured-data">(.*?)</script>', text, re.S)
        self.schema = json.loads(match[1]) if match else None
        self.title = re.search(r'<title>(.*?)</title>', text, re.S)[1]

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag == 'a' and 'href' in attrs: self.links.append(attrs['href'])

    def find(self, tag, key, value, result):
        return next(attrs[result] for name, attrs in self.tags if name == tag and attrs.get(key) == value)


def verify(root):
    base = json.loads((root / 'site-config.json').read_text())['url']
    files = sorted(root.glob('*.html'))
    pages = {file.name: Page(file.read_text(encoding='utf-8')) for file in files}
    urls, titles, descriptions = [], [], []
    for name, page in pages.items():
        if page.find('meta', 'name', 'robots', 'content').startswith('noindex'):
            assert name == 'dashboard.html'
            assert page.schema is None
            continue
        url = base + ('' if name == 'index.html' else name)
        assert page.find('link', 'rel', 'canonical', 'href') == url, name + ': canonical'
        assert page.find('meta', 'property', 'og:url', 'content') == url, name + ': og:url'
        assert page.find('meta', 'property', 'og:image', 'content') == base + 'assets/social.png'
        assert page.find('meta', 'name', 'twitter:image', 'content') == base + 'assets/social.png'
        assert page.find('meta', 'charset', 'UTF-8', 'charset') == 'UTF-8'
        assert len(page.ids) == len(set(page.ids)), name + ': IDs duplicados'
        assert sum(tag == 'h1' for tag, _ in page.tags) == 1, name + ': H1'
        assert page.schema['@context'] == 'https://schema.org'
        for link in page.links:
            parsed = urlparse(link)
            if parsed.scheme or parsed.netloc: continue
            target = unquote(parsed.path).lstrip('/') or name
            path = root / target
            assert path.exists(), f'{name}: link quebrado {link}'
            if path.is_dir(): target = str(Path(target) / 'index.html') if target != '.' else 'index.html'
            if parsed.fragment and target in pages:
                assert unquote(parsed.fragment) in pages[target].ids, f'{name}: âncora quebrada {link}'
        for tag, attrs in page.tags:
            resource = attrs.get('src') if tag in ('script', 'img') else attrs.get('href') if tag == 'link' and attrs.get('rel') in ('stylesheet', 'icon') else None
            if resource and not urlparse(resource).scheme:
                assert (root / resource).is_file(), f'{name}: recurso ausente {resource}'
        urls.append(url)
        titles.append(page.title)
        descriptions.append(page.find('meta', 'name', 'description', 'content'))
    assert len(titles) == len(set(titles)), 'Títulos duplicados'
    assert len(descriptions) == len(set(descriptions)), 'Descrições duplicadas'
    sitemap = ET.parse(root / 'sitemap.xml')
    listed = [el.text for el in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    assert sorted(listed) == sorted(urls), 'Sitemap incompleto'
    assert f'Sitemap: {base}sitemap.xml' in (root / 'robots.txt').read_text()
    return len(pages)


count = verify(ROOT)
with tempfile.TemporaryDirectory(prefix='atlas-seo-check-') as folder:
    clone = Path(folder)
    for name in ('assets', 'scripts'):
        shutil.copytree(ROOT / name, clone / name)
    for file in ROOT.glob('*.html'):
        shutil.copy2(file, clone / file.name)
    for name in ('site-config.json', 'robots.txt', 'sitemap.xml'):
        shutil.copy2(ROOT / name, clone / name)
    subprocess.run([sys.executable, str(clone / 'scripts/configure-site.py'), 'https://atlas.example'], check=True, capture_output=True)
    assert verify(clone) == count
    old_base = json.loads((ROOT / 'site-config.json').read_text())['url']
    for file in clone.glob('*.html'):
        assert old_base not in file.read_text(), file.name + ': origem anterior mantida'
print(f'PASS: {count} páginas, recursos, links e âncoras, metadados, JSON-LD, sitemap e troca de domínio.')
