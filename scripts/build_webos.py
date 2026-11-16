#!/usr/bin/env python3
"""Build a rooted-webOS Homebrew IPK containing the web app and USB service."""
import argparse
import gzip
import io
import json
from pathlib import Path
import tarfile
import re

ROOT = Path(__file__).resolve().parents[1]


def tar(entries):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode='w', format=tarfile.GNU_FORMAT) as archive:
        for name, data in entries:
            info = tarfile.TarInfo(name)
            info.size, info.mode, info.mtime = len(data), 0o644, 0
            archive.addfile(info, io.BytesIO(data))
    return gzip.compress(out.getvalue(), mtime=0)


def member(name, data):
    header = (name + '/').ljust(16) + '0'.ljust(12) + '0'.ljust(6) + '0'.ljust(6)
    header += '100644'.ljust(8) + str(len(data)).ljust(10) + '`\n'
    return header.encode('ascii') + data + (b'\n' if len(data) % 2 else b'')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', help='Package version, e.g. 1.0.16 for tag v1.0.16')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    source = ROOT / 'platforms/webos'
    meta = json.loads((source / 'app/appinfo.json').read_text())
    appid, version = meta['id'], args.version or meta['version']
    if not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', version):
        parser.error('Version must be MAJOR.MINOR.PATCH without a prerelease suffix')
    meta['version'] = version
    serviceid = json.loads((source / 'service/package.json').read_text())['name']
    files = []
    for directory, prefix in [('app', 'applications/' + appid), ('service', 'services/' + serviceid)]:
        for file in sorted((source / directory).rglob('*')):
            if file.is_file():
                relative = file.relative_to(source / directory).as_posix()
                data = file.read_bytes()
                if directory == 'app' and relative == 'appinfo.json':
                    data = (json.dumps(meta, indent=2) + '\n').encode()
                elif directory == 'app' and relative == 'js/version.js':
                    data = ('window.videowallVersion = ' + json.dumps(version) + ';\n').encode()
                elif directory == 'service' and relative == 'package.json':
                    service = json.loads(data)
                    service['version'] = version
                    data = (json.dumps(service) + '\n').encode()
                files.append(('./usr/palm/' + prefix + '/' + relative, data))
    appbase = './usr/palm/applications/' + appid + '/'
    files.append((appbase + 'icon.png', (ROOT / 'images/branding/icon-hd.png').read_bytes()))
    for name in ['LICENSE', 'NOTICE']:
        files.append((appbase + name, (ROOT / name).read_bytes()))
    package = {'id': appid, 'version': version, 'vendor': meta['vendor'], 'app': appid,
               'services': [serviceid], 'loc_name': meta['title'], 'package_format_version': 2}
    files.append(('./usr/palm/packages/' + appid + '/packageinfo.json', json.dumps(package).encode()))
    control = (f'Package: {appid}\nVersion: {version}\nSection: misc\nPriority: optional\n'
               'Architecture: all\nMaintainer: Gamma Production\nDescription: Rooted webOS Homebrew USB videowall\n'
               'webOS-Package-Format-Version: 2\n\n').encode()
    result = b'!<arch>\n' + member('debian-binary', b'2.0\n')
    result += member('control.tar.gz', tar([('./control', control)])) + member('data.tar.gz', tar(files))
    target = args.output_dir / f'{appid}_{version}_all.ipk'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(result)
    print(target)


if __name__ == '__main__':
    main()
