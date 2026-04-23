import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Nome do cookie que guarda o token JWT da sessão.
 */
const AUTH_COOKIE = "auth_token";

/**
 * Chave usada para validar o JWT.
 *
 * Em produção, JWT_SECRET deve vir do ambiente.
 */
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "troque-essa-chave-em-producao"
);

/**
 * Rotas que exigem autenticação.
 *
 * Observação:
 * como "/" está aqui, a home é protegida.
 */
const rotasProtegidas = ["/", "/nova-maquina", "/editar-maquina"];

/**
 * Rotas restritas ao perfil master.
 */
const rotasMaster = ["/funcionarios", "/auditoria", "/importar-maquinas"];

/**
 * Lê e valida a sessão a partir do token JWT.
 *
 * Retorna:
 * - payload da sessão, se token válido
 * - null, se token inválido
 */
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

/**
 * Middleware principal de autenticação/autorização.
 *
 * Regras:
 * - se rota protegida exigir login e o usuário não estiver autenticado,
 *   redireciona para /login
 * - se rota exigir master e o usuário não for master,
 *   redireciona para /
 * - se o usuário já estiver logado e tentar acessar /login,
 *   redireciona para /
 */
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


if (pathname.startsWith("/api/db-test")) {
  return NextResponse.next();
}

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

/**
 * Matcher das rotas em que o middleware será executado.
 *
 * Importante:
 * se novas páginas protegidas forem criadas,
 * elas precisam entrar aqui também.
 */
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