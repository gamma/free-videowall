#!/usr/bin/env python3
"""Check callback forwarding and encrypted keyring persistence using disposable data."""
import json
import secrets
import subprocess
import time
from urllib.request import urlopen
import uuid

from tizen_certificates import docker, IMAGE

NAME = f'free-videowall-tizen-test-{uuid.uuid4().hex[:12]}'
KEYRINGS = '/home/developer/.local/share/keyrings'
CORE = '/opt/samsung-source/tizen-sdk-skills/common/lib/core'


def start():
    docker('run', '-d', '--platform', 'linux/amd64', '--name', NAME,
           '--publish', '127.0.0.1:14794:14894',
           '--mount', f'type=volume,source={NAME},target={KEYRINGS}', IMAGE,
           capture_output=True)
    wait_ready()


def wait_ready():
    for attempt in range(40):
        try:
            docker('exec', NAME, 'dbus-send', '--session', '--print-reply',
                   '--dest=org.freedesktop.DBus', '/org/freedesktop/DBus',
                   'org.freedesktop.DBus.Peer.Ping', capture_output=True, timeout=5)
            return
        except Exception:
            if attempt == 39:
                raise
            time.sleep(0.25)


def unlock(password):
    docker('exec', '-i', NAME, 'gnome-keyring-daemon', '--unlock',
           '--components=secrets', '--control-directory=/tmp/tizen-keyring', input=password.encode(),
           capture_output=True)


def main():
    password, secret = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    try:
        start()
        # A fixture server, not Samsung's OAuth handler: no fabricated login data.
        docker('exec', '-d', NAME, 'node', '-e',
               "require('http').createServer((req,res)=>res.end('callback proxy OK'))"
               ".listen(4794,'127.0.0.1')")
        for attempt in range(40):
            try:
                with urlopen('http://127.0.0.1:14794/probe', timeout=2) as response:
                    assert response.read() == b'callback proxy OK'
                break
            except Exception:
                if attempt == 39:
                    raise
                time.sleep(0.25)
        print('Host-to-container-loopback callback: OK', flush=True)
        unlock(password)
        script = f"""
const store = require({json.dumps(CORE + '/samsung-pwd-store')});
const marker = {json.dumps(KEYRINGS + '/probe.pwd')};
let input=''; process.stdin.on('data', c=>input+=c);
process.stdin.on('end', async()=>{{
  try {{
    await store.encryptPassword(input, marker);
    if(await store.decryptPassword(marker)!==input) throw Error('Roundtrip failed');
  }} catch(e) {{ console.error(e.message.replaceAll(input,'[redacted]')); process.exitCode=1; }}
}});
"""
        try:
            docker('exec', '-i', NAME, 'node', '-e', script, input=secret.encode(),
                   capture_output=True, timeout=30)
        except subprocess.CalledProcessError as error:
            raise AssertionError(error.stderr.decode()) from None
        print('Official Samsung password-store roundtrip: OK', flush=True)
        docker('restart', NAME, capture_output=True)
        wait_ready()
        unlock(password)
        print('Secret Service restarts with the container: OK', flush=True)
        docker('rm', '-f', NAME, capture_output=True)
        start()
        unlock(password)
        script = f"""
const store = require({json.dumps(CORE + '/samsung-pwd-store')});
let input=''; process.stdin.on('data', c=>input+=c);
process.stdin.on('end', async()=>{{
  try {{
    if(await store.decryptPassword({json.dumps(KEYRINGS + '/probe.pwd')})!==input)
      throw Error('Persistence failed');
    const fs=require('fs');
    for(const name of fs.readdirSync({json.dumps(KEYRINGS)})) {{
      const file={json.dumps(KEYRINGS)}+'/'+name;
      if(fs.statSync(file).isFile() && fs.readFileSync(file).includes(Buffer.from(input)))
        throw Error('Plaintext secret found');
    }}
  }} catch(e) {{ console.error('Persistent encrypted storage check failed'); process.exitCode=1; }}
}});
"""
        docker('exec', '-i', NAME, 'node', '-e', script, input=secret.encode(),
               capture_output=True)
        print('Encrypted keyring survives container replacement: OK', flush=True)
    finally:
        # Only the uniquely named disposable container and its test volume.
        try:
            docker('rm', '-f', NAME, capture_output=True)
        finally:
            docker('volume', 'rm', NAME, capture_output=True)


if __name__ == '__main__':
    main()
