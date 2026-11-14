#!/usr/bin/env python3
"""Build the sideload ZIP without an enclosing folder."""
import argparse
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import xml.etree.ElementTree as ET
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--include-local-frames", action="store_true", help="Include private, local frame images; do not use for public releases")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
files = [root / name for name in ('manifest', 'LICENSE', 'NOTICE')]
for folder in ('source', 'components', 'images'):
    files.extend(path for path in sorted((root / folder).rglob('*'))
                 if not path.name.startswith('.') and (folder != 'images' or args.include_local_frames))
for path in files:
    if path.suffix == '.xml':
        ET.parse(path)
out = root / 'dist/free-videowall.zip'
out.parent.mkdir(exist_ok=True)
with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
    for path in files:
        if path.is_file():
            archive.write(path, path.relative_to(root))
print(out)
