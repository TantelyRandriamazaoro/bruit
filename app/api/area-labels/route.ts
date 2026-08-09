import { resolveAndCacheAreaLabels } from "@/lib/area-labels-server";
import type { AreaPoint } from "@/lib/area-cell";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  points?: AreaPoint[];
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const points = Array.isArray(body.points) ? body.points.slice(0, 40) : [];
  if (points.length === 0) {
    return NextResponse.json({ labels: {} });
  }

  try {
    const labels = await resolveAndCacheAreaLabels(points);
    return NextResponse.json({ labels });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "resolve_failed" }, { status: 500 });
  }
}
