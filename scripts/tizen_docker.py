#!/usr/bin/env python3
"""Build the Samsung app or run Tizen CLI commands inside the SDK container."""
import argparse
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
image = 'free-videowall/tizen-sdk:10.0'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=['image', 'build', 'cli'])
parser.add_argument('arguments', nargs=argparse.REMAINDER)
args = parser.parse_args()
environment = os.environ.copy()
# This machine has a plain HTTP loopback daemon with inherited TLS variables.
# Keep TLS intact for every other daemon/context.
if environment.get('DOCKER_HOST') in ('127.0.0.1:4243', 'tcp://127.0.0.1:4243'):
    environment.pop('DOCKER_TLS_VERIFY', None)
    environment.pop('DOCKER_CERT_PATH', None)
environment['DOCKER_BUILDKIT'] = '1'

def docker(*arguments):
    subprocess.run(['docker', *arguments], env=environment, cwd=root, check=True)

if args.action == 'image':
    docker('build', '--platform', 'linux/amd64', '-t', image, 'tools/tizen')
else:
    command = args.arguments
    if command[:1] == ['--']:
        command = command[1:]
    if args.action == 'build':
        command = ['bash', '-ec', 'python3 scripts/build_tizen.py; tizen build-web -- dist/tizen; python3 scripts/package_tizen_unsigned.py']
    if not command:
        parser.error('cli requires a command, e.g. cli -- sdb version')
    certificate_mount = []
    if environment.get('TIZEN_CERT_DIR'):
        certificates = Path(environment['TIZEN_CERT_DIR']).expanduser().resolve()
        if not certificates.is_dir():
            parser.error('TIZEN_CERT_DIR must be an existing directory')
        certificate_mount = ['--mount', f'type=bind,source={certificates},target=/certs,readonly']
    docker('run', '--rm', '--platform', 'linux/amd64', *certificate_mount,
           '--mount', f'type=bind,source={root},target=/workspace',
           '--mount', 'type=volume,source=free-videowall-tizen-data,target=/home/developer/tizen-studio-data',
           image, *command)
