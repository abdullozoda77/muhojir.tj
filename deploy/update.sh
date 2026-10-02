#!/usr/bin/env bash
# Updates Muhojir on the server to the latest code on GitHub (main). Run as root:
#   bash /home/romin/muhojir/deploy/update.sh
set -euo pipefail
sudo -u romin -H git -C /home/romin/muhojir pull --ff-only
exec bash /home/romin/muhojir/deploy/setup.sh
