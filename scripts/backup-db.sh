#!/usr/bin/env bash
# Dump the production MySQL database to backups/droolbites-YYYYmmdd-HHMM.sql.gz and keep
# the newest 14. Run on the VPS from anywhere:  bash scripts/backup-db.sh
# Cron (daily 02:30): see docs/deploy-vps.md.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups

out="backups/droolbites-$(date +%Y%m%d-%H%M).sql.gz"
# The password is read inside the db container (MYSQL_PWD), so it is not on any command line.
docker compose -f compose.yml -f compose.prod.yml exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --triggers --no-tablespaces --databases "$MYSQL_DATABASE"' \
  | gzip > "$out.part"
mv "$out.part" "$out"
echo "Backup written: $out ($(du -h "$out" | cut -f1))"

# Keep the newest 14 backups (the timestamped names sort by date).
find backups -maxdepth 1 -name 'droolbites-*.sql.gz' | sort -r | tail -n +15 | xargs -r rm -f --
