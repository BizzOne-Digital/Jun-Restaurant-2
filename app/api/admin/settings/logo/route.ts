import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error!;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form-data" }, { status: 400 });
  }

  const entry = form.get("file");
  if (!entry || typeof entry === "string") {
    return NextResponse.json({ error: 'Missing file field "file"' }, { status: 400 });
  }

  const file = entry as File;
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
  }

  const mime = file.type || "";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: "Only PNG, JPEG, WebP, or SVG images are allowed" }, { status: 400 });
  }

  const ext =
    mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "svg";
  const buf = Buffer.from(await file.arrayBuffer());

  if (ext === "svg") {
    const head = buf.toString("utf8", 0, Math.min(512, buf.length)).trimStart().toLowerCase();
    if (!head.includes("<svg")) {
      return NextResponse.json({ error: "Invalid SVG" }, { status: 400 });
    }
  }

  const name = `logo-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);

  return NextResponse.json({ url: `/uploads/${name}` });
}
