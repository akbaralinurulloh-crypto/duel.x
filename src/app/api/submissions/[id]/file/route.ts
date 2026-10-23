import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Short-lived signed link to a submission's file. Row-level security decides
// who can see the submission (owner or admin); Storage RLS decides the object.
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/submissions/[id]/file">,
) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  if (!isSupabaseConfigured()) return new NextResponse("Service unavailable", { status: 503 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: row } = await supabase
    .from("submissions")
    .select("file_path, file_name")
    .eq("id", id)
    .maybeSingle();
  if (!row?.file_path) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await supabase.storage
    .from("submissions")
    .createSignedUrl(row.file_path, 60, { download: row.file_name ?? true });
  if (error || !data) return new NextResponse("Not found", { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}
