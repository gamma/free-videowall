#!/usr/bin/env python3
"""Package SDK build output for later signing; this WGT is not installable yet."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
source = root / 'dist/tizen/.buildResult'
if not (source / 'config.xml').is_file():
    raise SystemExit('Missing Tizen SDK build output; run the container build first.')
output = root / 'dist/free-videowall-tizen-unsigned.wgt'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(source.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(source))
print(f'Unsigned WGT (sign with your Samsung certificate before installation): {output}')
