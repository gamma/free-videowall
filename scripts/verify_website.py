#!/usr/bin/env python3
"""Check static Pages links, required legal pages and Store listing lengths."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'website'


class LinkChecker(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key not in ('href', 'src') or not value:
                continue
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path:
                continue
            target = (self.path.parent / unquote(url.path)).resolve()
            if not target.is_relative_to(SITE.resolve()) or not target.exists():
                raise ValueError(f'{self.path.relative_to(ROOT)}: broken local link {value}')


for language in ('', 'de'):
    for name in ('index', 'privacy', 'terms', 'imprint', 'support'):
        path = SITE / language / f'{name}.html'
        LinkChecker(path).feed(path.read_text(encoding='utf-8'))

for language in ('en', 'de'):
    for kind, limit in (('short', 300), ('long', 1500)):
        path = ROOT / 'docs' / 'store-assets' / f'description-{language}-{kind}.txt'
        length = len(path.read_text(encoding='utf-8').rstrip('\n'))
        if not 0 < length <= limit:
            raise ValueError(f'{path.name}: {length} characters; limit {limit}')

print('Website: 10 EN/DE pages, local links and Store description limits verified.')
