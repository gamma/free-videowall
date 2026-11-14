#!/usr/bin/env python3
"""Verify release version, manifest artwork and public package contents."""
import argparse
import json
from pathlib import Path
import re
from zipfile import ZipFile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--tag', required=True)
parser.add_argument('--root', type=Path, default=root)
args = parser.parse_args()
root = args.root.resolve()
if not re.fullmatch(r'v\d+\.\d+\.\d+', args.tag):
    parser.error('Tag must be vMAJOR.MINOR.BUILD')
manifest = dict(line.split('=', 1) for line in (root / 'manifest').read_text().splitlines() if '=' in line)
version = '.'.join(manifest[key] for key in ('major_version', 'minor_version', 'build_version'))
if args.tag != 'v' + version or json.loads((root / 'package.json').read_text())['version'] != version:
    parser.error('Tag, manifest and package.json versions must match')
with ZipFile(root / 'dist/free-videowall.zip') as archive:
    names = archive.namelist()
    if archive.testzip() or not {'manifest', 'LICENSE', 'NOTICE'}.issubset(names):
        parser.error('Package is corrupt or missing required root files')
    if sum(item.file_size for item in archive.infolist()) > 4 * 1024 * 1024:
        parser.error('Package exceeds 4 MiB')
    if any(name.startswith('images/endframes/') for name in names):
        parser.error('Public package contains private local transition frames')
    if archive.read('manifest') != (root / 'manifest').read_bytes():
        parser.error('ZIP manifest differs from source; rebuild it')
    for key, value in manifest.items():
        if value.startswith('pkg:/') and value[5:] not in names:
            parser.error('Missing manifest asset: ' + key)
print('PASS: release version, package integrity, license, artwork references and private-frame exclusion')
