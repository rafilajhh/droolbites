/**
 * DATABASE_URL for the MariaDB driver adapter.
 *
 * MySQL 8.4 authenticates with caching_sha2_password. Right after the server
 * restarts its auth cache is empty, so the first login over a non-TLS
 * connection needs the server's RSA public key; without
 * `allowPublicKeyRetrieval` the driver refuses and every query fails with
 * "pool failed to retrieve a connection". Fetching the key unauthenticated
 * is only safe where nobody can sit in the middle, so it is added only for
 * this machine (localhost, 127.0.0.1, ::1) and the compose service `db` on
 * the Docker network. Any other host needs TLS (or sets the flag itself).
 *
 * Kept out of .env so the Prisma CLI (migrate) sees the plain URL.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "db"]);

export function mariadbUrl(url = process.env.DATABASE_URL): string {
  if (!url) throw new Error("DATABASE_URL is not set.");
  const parsed = new URL(url);
  if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase()) && !parsed.searchParams.has("allowPublicKeyRetrieval")) {
    parsed.searchParams.set("allowPublicKeyRetrieval", "true");
  }
  return parsed.toString();
}
