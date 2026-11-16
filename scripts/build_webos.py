#!/usr/bin/env python3
"""Build a private rooted-webOS IPK containing the web app and USB service."""
import io
import json
from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[1]


def tar(entries):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode='w:gz', format=tarfile.GNU_FORMAT) as archive:
        for name, data in entries:
            info = tarfile.TarInfo(name)
            info.size, info.mode, info.mtime = len(data), 0o644, 0
            archive.addfile(info, io.BytesIO(data))
    return out.getvalue()


def member(name, data):
    header = (name + '/').ljust(16) + '0'.ljust(12) + '0'.ljust(6) + '0'.ljust(6)
    header += '100644'.ljust(8) + str(len(data)).ljust(10) + '`\n'
    return header.encode('ascii') + data + (b'\n' if len(data) % 2 else b'')


def main():
    source = ROOT / 'platforms/webos'
    meta = json.loads((source / 'app/appinfo.json').read_text())
    appid, version = meta['id'], meta['version']
    serviceid = json.loads((source / 'service/package.json').read_text())['name']
    files = []
    for directory, prefix in [('app', 'applications/' + appid), ('service', 'services/' + serviceid)]:
        for file in sorted((source / directory).rglob('*')):
            if file.is_file():
                files.append(('./usr/palm/' + prefix + '/' + file.relative_to(source / directory).as_posix(), file.read_bytes()))
    appbase = './usr/palm/applications/' + appid + '/'
    files.append((appbase + 'icon.png', (ROOT / 'images/branding/icon-hd.png').read_bytes()))
    for name in ['LICENSE', 'NOTICE']:
        files.append((appbase + name, (ROOT / name).read_bytes()))
    package = {'id': appid, 'version': version, 'vendor': meta['vendor'], 'app': appid,
               'services': [serviceid], 'loc_name': meta['title'], 'package_format_version': 2}
    files.append(('./usr/palm/packages/' + appid + '/packageinfo.json', json.dumps(package).encode()))
    control = (f'Package: {appid}\nVersion: {version}\nSection: misc\nPriority: optional\n'
               'Architecture: all\nMaintainer: Gamma Production\nDescription: Private webOS USB videowall\n'
               'webOS-Package-Format-Version: 2\n\n').encode()
    result = b'!<arch>\n' + member('debian-binary', b'2.0\n')
    result += member('control.tar.gz', tar([('./control', control)])) + member('data.tar.gz', tar(files))
    target = ROOT / 'dist' / f'{appid}_{version}_all.ipk'
    target.parent.mkdir(exist_ok=True)
    target.write_bytes(result)
    print(target)


if __name__ == '__main__':
    main()
