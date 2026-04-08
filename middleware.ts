import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE = "auth_token";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "troque-essa-chave-em-producao"
);

const rotasProtegidas = ["/", "/nova-maquina", "/editar-maquina"];
const rotasMaster = ["/funcionarios", "/auditoria", "/importar-maquinas"];

async function getSessao(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as {
      id: number;
      nome: string;
      email: string;
      perfil: string;
    };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  const precisaLogin = rotasProtegidas.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
  );

  const precisaMaster = rotasMaster.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
  );

  const sessao = token ? await getSessao(token) : null;
  const autenticado = !!sessao;

  if ((precisaLogin || precisaMaster) && !autenticado) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (precisaMaster && sessao?.perfil !== "master") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname === "/login" && autenticado) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/primeiro-acesso",
    "/nova-maquina/:path*",
    "/editar-maquina/:path*",
    "/funcionarios/:path*",
    "/auditoria/:path*",
    "/importar-maquinas/:path*",
  ],
};