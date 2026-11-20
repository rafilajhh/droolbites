#!/usr/bin/env bash
# Dump the production MySQL database to backups/droolbites-YYYYmmdd-HHMM.sql.gz and the product
# photos uploaded in the admin (the `uploads` volume) to backups/uploads-YYYYmmdd-HHMM.tar.gz, and
# keep the newest 14 of each. Run on the VPS from anywhere:  bash scripts/backup-db.sh
# Cron (daily 02:30): see docs/deploy-vps.md.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups
compose=(docker compose -f compose.yml -f compose.prod.yml)
stamp="$(date +%Y%m%d-%H%M)"

out="backups/droolbites-$stamp.sql.gz"
# The password is read inside the db container (MYSQL_PWD), so it is not on any command line.
"${compose[@]}" exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --triggers --no-tablespaces --databases "$MYSQL_DATABASE"' \
  | gzip > "$out.part"
mv "$out.part" "$out"
echo "Backup written: $out ($(du -h "$out" | cut -f1))"

# The uploads are read through the running app container, which mounts the volume. A failure here
# (app down) is reported but does not undo or fail the database backup above.
photos="backups/uploads-$stamp.tar.gz"
if "${compose[@]}" exec -T app tar czf - -C /app/public/uploads . > "$photos.part"; then
  mv "$photos.part" "$photos"
  echo "Backup written: $photos ($(du -h "$photos" | cut -f1))"
else
  rm -f "$photos.part"
  echo "Uploads not backed up (is the app container running?)." >&2
fi

# Keep the newest 14 of each (the timestamped names sort by date).
for pattern in 'droolbites-*.sql.gz' 'uploads-*.tar.gz'; do
  find backups -maxdepth 1 -name "$pattern" | sort -r | tail -n +15 | xargs -r rm -f --
done
