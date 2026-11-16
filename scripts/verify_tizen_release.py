#!/usr/bin/env python3
"""Validate the public, unsigned Samsung preview; never publish device signatures."""
import argparse
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile


def verify(root):
    source = root / 'platforms/tizen'
    required = {'LICENSE', 'NOTICE', 'config.xml', 'icon.png', 'index.html',
                'js/app.js', 'js/playlist.js', 'js/transitions.js'}
    with ZipFile(root / 'dist/free-videowall-tizen-unsigned.wgt') as archive:
        names = archive.namelist()
        if archive.testzip() or len(names) != len(set(names)):
            raise ValueError('Corrupt WGT or duplicate entries')
        # Fail closed: no private media, certificates or device-bound signatures.
        if set(names) != required:
            raise ValueError('Unsigned public WGT has unexpected or missing files')
        for name in required - {'icon.png'}:
            original = root / name if name in {'LICENSE', 'NOTICE'} else source / name
            if archive.read(name) != original.read_bytes():
                raise ValueError('WGT differs from tagged source: ' + name)
        if archive.read('icon.png') != (root / 'images/branding/icon-hd.png').read_bytes():
            raise ValueError('WGT icon differs from source')
        config = ET.fromstring(archive.read('config.xml'))
        version = config.attrib['version']
        print('PASS: unsigned Samsung WGT, version ' + version + ', source and public-file checks')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    verify(args.root.resolve())
