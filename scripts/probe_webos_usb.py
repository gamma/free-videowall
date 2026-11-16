#!/usr/bin/env python3
"""Read-only USB capability probe for an explicitly selected rooted webOS TV."""
import argparse
import json
import re
import shlex
import subprocess


def usb_mounts(text):
    """Select real USB mounts, excluding the tmpfs mount-point directory."""
    result = []
    for line in text.splitlines():
        fields = line.split()
        if len(fields) < 3:
            continue
        mount = re.sub(r'\\([0-7]{3})', lambda m: chr(int(m[1], 8)), fields[1])
        if (mount.startswith('/tmp/usb/') or mount.startswith('/media/usb/')) and fields[2] not in ('tmpfs', 'devtmpfs'):
            result.append(mount)
    return sorted(set(result))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', required=True, help='Current LG TV IP or hostname')
    parser.add_argument('--user', default='root')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_.:-]+', args.host) or args.host.startswith('-'):
        parser.error('Invalid host')
    if not re.fullmatch(r'[A-Za-z0-9_-]+', args.user):
        parser.error('Invalid user')

    def read(command):
        return subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5',
                               f'{args.user}@{args.host}', command], check=True,
                              capture_output=True, timeout=15).stdout

    try:
        mounts = usb_mounts(read('cat /proc/mounts').decode())
        results = []
        for mount in mounts:
            # Paths originate in the mount table and are shell quoted independently.
            command = 'find ' + shlex.quote(mount) + " -maxdepth 1 -type f \\( -iname '*.m3u' -o -iname '*.m3u8' \\)"
            files = [p for p in read(command).decode().splitlines()
                     if not p.rsplit('/', 1)[-1].startswith('.')]
            preferred = mount + '/playlist.m3u'
            files.sort(key=lambda p: (p != preferred, p))
            entry = {'mount': mount, 'playlist_count': len(files), 'playlist_readable': False}
            if files:
                text = read('head -c 1048577 ' + shlex.quote(files[0]))
                if len(text) > 1048576:
                    raise ValueError('Playlist exceeds 1 MiB probe limit')
                text.decode('utf-8-sig')
                entry.update(playlist_readable=True, playlist_bytes=len(text))
            results.append(entry)
        print(json.dumps({'ssh': True, 'usb_mounts': results,
                          'usb_playlist_read_verified': any(r['playlist_readable'] for r in results)}, indent=2))
    except (subprocess.SubprocessError, UnicodeError, ValueError) as error:
        # Never echo SSH output that might contain device-local information.
        raise SystemExit('USB probe failed: ' + type(error).__name__) from None


if __name__ == '__main__':
    main()
