import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Product photos uploaded from the admin are written to public/uploads at
 * runtime. In development Next serves them as public files; a production
 * server only serves public files that existed at build time, so this route
 * serves the rest. Files are returned byte-for-byte (no compression).
 */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: RouteContext<"/uploads/[name]">) {
  const { name } = await params;
  const file = path.basename(name);
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type || file !== name) return new Response("Not found", { status: 404 });

  const fullPath = path.join(UPLOAD_DIR, file);
  try {
    const info = await stat(fullPath);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const body = await readFile(fullPath);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(body.byteLength),
        // Names are never reused (slug + upload timestamp), so a name always means the same bytes.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
