#!/usr/bin/env python3
"""Stage the Samsung Web app for Tizen Studio signing (not a signed WGT)."""
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
source = root / 'platforms/tizen'
target = root / 'dist/tizen'
ET.parse(source / 'config.xml')
if target.exists():
    shutil.rmtree(target)
(target / 'js').mkdir(parents=True)
for name in ('config.xml', 'index.html'):
    shutil.copy2(source / name, target / name)
for path in sorted((source / 'js').glob('*.js')):
    shutil.copy2(path, target / 'js' / path.name)
for name in ('LICENSE', 'NOTICE'):
    shutil.copy2(root / name, target / name)
shutil.copy2(root / 'images/branding/icon-hd.png', target / 'icon.png')
print(f'Staged unsigned Samsung application: {target}')
print('Sign/package with Tizen Studio before installing on a TV; see docs/tizen.md.')
