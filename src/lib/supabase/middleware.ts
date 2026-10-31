import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicSupabaseKey } from "@/lib/public-env";

function isProtected(pathname: string): boolean {
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/api/storyteller")) return true;
  if (pathname.startsWith("/api/packet")) return true;
  if (pathname.startsWith("/api/va")) return true;
  if (pathname.startsWith("/api/conditions")) return true;
  if (pathname.startsWith("/api/evidence")) return true;
  if (pathname.startsWith("/api/providers")) return true;
  if (pathname.startsWith("/api/profile")) return true;
  if (pathname === "/api/witness") return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicSupabaseKey();
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers?: Record<string, string>) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        if (headers) {
          Object.entries(headers).forEach(([header, value]) => {
            supabaseResponse.headers.set(header, value);
          });
        }
      },
    },
  });

  let authed = false;
  try {
    const { data } = await supabase.auth.getClaims();
    authed = Boolean(data?.claims);
  } catch {
    authed = false;
  }

  if (!authed && isProtected(request.nextUrl.pathname)) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  return supabaseResponse;
}
