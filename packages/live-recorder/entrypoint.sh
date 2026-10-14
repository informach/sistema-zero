#!/bin/sh
set -eu

data_dir="${LIVE_RECORDER_DATA_DIR:-/data/live-recorder}"
case "$data_dir" in
  /data/live-recorder|/data/live-recorder/*) ;;
  *) echo 'LIVE_RECORDER_DATA_DIR must be inside /data/live-recorder' >&2; exit 1 ;;
esac

if [ "$(id -u)" = 0 ]; then
  mkdir -p "$data_dir"
  chown pwuser:pwuser "$data_dir"
  chmod 700 "$data_dir"
  exec gosu pwuser "$@"
fi

if [ ! -w "$data_dir" ]; then
  echo 'The recorder data directory is not writable' >&2
  exit 1
fi
exec "$@"
