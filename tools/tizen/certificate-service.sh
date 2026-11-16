#!/bin/sh
set -eu
umask 077
mkdir -p /tmp/tizen-keyring "$HOME/.local/share/keyrings"
dbus-daemon --session --fork --address="$DBUS_SESSION_BUS_ADDRESS"
# The user initializes the Secret Service with --unlock --components=secrets.
# Starting it before the first unlock creates an unusable login collection.
# Published only on the host's loopback interface. Samsung's unchanged OAuth
# server listens on container loopback: the second port bridges that boundary.
exec socat TCP-LISTEN:14894,bind=0.0.0.0,reuseaddr,fork TCP:127.0.0.1:4794
