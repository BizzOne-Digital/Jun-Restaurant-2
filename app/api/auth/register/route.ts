import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().max(30).optional(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await connectDB();
    const email = parsed.data.email.toLowerCase().trim();
    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await User.create({
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      phone: parsed.data.phone?.trim() ?? "",
      role: "customer",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
