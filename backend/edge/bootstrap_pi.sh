#!/usr/bin/env bash
# Run once on the Pi after first SSH login:  bash ~/capstone/edge/bootstrap_pi.sh
set -euo pipefail
sudo apt-get update
# Debian packages instead of pip: no compiling on a Pi 3, works on Bookworm's managed Python.
sudo apt-get install -y python3-aiohttp chrony git
sudo timedatectl set-timezone "${TZ_NAME:-Asia/Kolkata}"

# Keep the journal in RAM to spare the Class 6 card; our CSV logs are small and line-buffered.
sudo mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nStorage=volatile\nRuntimeMaxUse=30M\n' | sudo tee /etc/systemd/journald.conf.d/ram.conf >/dev/null
sudo systemctl restart systemd-journald

# Free RAM on a 1 GB board: no desktop, no Bluetooth needed for this node.
sudo systemctl disable --now bluetooth hciuart 2>/dev/null || true

DIR="$(cd "$(dirname "$0")" && pwd)"
[ -f "$DIR/prober.env" ] || { cp "$DIR/prober.env.example" "$DIR/prober.env"; echo ">> edit $DIR/prober.env"; }
sed "s#/home/pi#$HOME#g; s#User=pi#User=$USER#" "$DIR/edge-prober.service" | sudo tee /etc/systemd/system/edge-prober.service >/dev/null
sudo systemctl daemon-reload
echo "Done. Next: nano $DIR/prober.env, then python3 $DIR/prober.py --smoke, then sudo systemctl enable --now edge-prober"
