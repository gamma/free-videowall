#!/usr/bin/env python3
"""Run Samsung certificate tools in a persistent, headless SDK container."""
import argparse
import getpass
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
IMAGE = 'free-videowall/tizen-certificates:10.0'
CONTAINER = 'free-videowall-tizen-certificates'
CLI = '/opt/samsung-source/tizen-sdk-skills/common/lib/cli/cert-manager-cli.js'
PROFILE = 'FreeVideowallSamsung'
ENVIRONMENT = os.environ.copy()
if ENVIRONMENT.get('DOCKER_HOST') in ('127.0.0.1:4243', 'tcp://127.0.0.1:4243'):
    ENVIRONMENT.pop('DOCKER_TLS_VERIFY', None)
    ENVIRONMENT.pop('DOCKER_CERT_PATH', None)
ENVIRONMENT['DOCKER_BUILDKIT'] = '1'


def docker(*arguments, **options):
    return subprocess.run(['docker', *arguments], env=ENVIRONMENT, cwd=ROOT,
                          check=True, **options)


def cli(action, *arguments, interactive=False):
    if interactive and not sys.stdin.isatty():
        raise SystemExit('Run this command in your terminal for hidden password entry.')
    docker('exec', *(['-it'] if interactive else []), CONTAINER,
           'node', CLI, action, *arguments)


def keyring_unlocked():
    owner = docker('exec', CONTAINER, 'dbus-send', '--session', '--print-reply',
                   '--dest=org.freedesktop.DBus', '/org/freedesktop/DBus',
                   'org.freedesktop.DBus.NameHasOwner', 'string:org.freedesktop.secrets',
                   capture_output=True, text=True)
    if 'boolean true' not in owner.stdout:
        return False
    state = docker('exec', CONTAINER, 'dbus-send', '--session', '--print-reply',
                   '--dest=org.freedesktop.secrets',
                   '/org/freedesktop/secrets/collection/login',
                   'org.freedesktop.DBus.Properties.Get',
                   'string:org.freedesktop.Secret.Collection', 'string:Locked',
                   capture_output=True, text=True)
    return 'boolean false' in state.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['image', 'start', 'status', 'stop',
                                         'login', 'unlock', 'author',
                                         'distributor', 'profile', 'profiles'])
    parser.add_argument('--profile', default=PROFILE)
    parser.add_argument('--identity')
    parser.add_argument('--tv')
    args = parser.parse_args()
    if args.action in ('author', 'distributor', 'profile') and not keyring_unlocked():
        parser.error('First run: python3 scripts/tizen_certificates.py unlock')
    if args.action == 'image':
        docker('build', '--platform', 'linux/amd64', '-t', IMAGE, '-f',
               'tools/tizen/Dockerfile.certificates', 'tools/tizen')
    elif args.action == 'start':
        existing = subprocess.run(['docker', 'inspect', '--format', '{{.State.Running}}',
                                   CONTAINER], env=ENVIRONMENT, capture_output=True, text=True)
        if existing.returncode == 0:
            if existing.stdout.strip() != 'true':
                docker('start', CONTAINER)
            else:
                print('Certificate container is already running.')
        else:
            docker('run', '-d', '--platform', 'linux/amd64', '--name', CONTAINER,
                   '--publish', '127.0.0.1:4794:14894',
                   '--mount', 'type=volume,source=free-videowall-tizen-data,target=/home/developer/tizen-studio-data',
                   '--mount', 'type=volume,source=free-videowall-tizen-keyring,target=/home/developer/.local/share/keyrings',
                   '--mount', f'type=bind,source={ROOT},target=/workspace', IMAGE)
    elif args.action == 'status':
        docker('inspect', '--format', '{{.State.Status}}', CONTAINER)
        cli('list-profiles')
    elif args.action == 'stop':
        docker('stop', CONTAINER)
    elif args.action == 'login':
        cli('samsung-login', '--profile-name', args.profile)
    elif args.action == 'unlock':
        if keyring_unlocked():
            print('Keyring is already unlocked for this container session.')
            return
        if not sys.stdin.isatty():
            parser.error('Run unlock in your terminal for hidden password entry.')
        password = getpass.getpass('Keyring password (choose one on first use): ')
        if not password:
            parser.error('Use a non-empty keyring password.')
        if password != getpass.getpass('Repeat keyring password: '):
            parser.error('Passwords do not match.')
        # Only stdin carries the password; no shell interpolation or command-line secret.
        docker('exec', '-i', CONTAINER, 'gnome-keyring-daemon', '--unlock',
               '--components=secrets', '--control-directory=/tmp/tizen-keyring', input=password.encode(),
               stdout=subprocess.DEVNULL)
        if not keyring_unlocked():
            parser.error('Keyring remains locked. Check your keyring password.')
        print('Encrypted keyring is unlocked for this container session.')
    elif args.action == 'author':
        if not args.identity:
            parser.error('author requires --identity (certificate author name).')
        cli('generate-samsung-author', '--profile-name', args.profile,
            '--identity', args.identity, '--prompt-password', interactive=True)
    elif args.action == 'distributor':
        if not args.tv:
            parser.error('distributor requires --tv (TV IP address).')
        serial = f'{args.tv}:26101'
        docker('exec', CONTAINER, 'sdb', 'connect', serial)
        result = docker('exec', CONTAINER, 'node', CLI, 'acquire-duid', '--serial',
                        serial, capture_output=True, text=True)
        duid = json.loads(result.stdout)['result']['duid']
        cli('generate-samsung-distributor', '--profile-name', args.profile,
            '--duid-list', duid, '--privilege', 'Public', '--prompt-password',
            interactive=True)
    elif args.action == 'profile':
        cli('create-samsung-profile', '--profile-name', args.profile, '--active')
    elif args.action == 'profiles':
        cli('list-profiles')


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        # Do not print command arguments or captured output containing secrets.
        raise SystemExit(f'Container command failed (exit {error.returncode}).') from None
