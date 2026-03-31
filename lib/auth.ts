import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "troque-essa-chave-em-producao"
);

export const AUTH_COOKIE = "auth_token";

export type SessaoFuncionario = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
};

export async function criarToken(funcionario: SessaoFuncionario) {
  return new SignJWT(funcionario)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verificarToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET);

  return {
    id: Number(payload.id),
    nome: String(payload.nome),
    email: String(payload.email),
    perfil: String(payload.perfil),
  } satisfies SessaoFuncionario;
}

export async function getFuncionarioLogado() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) return null;

  try {
    return await verificarToken(token);
  } catch {
    return null;
  }
}

export async function getSessaoServidor() {
  return await getFuncionarioLogado();
}

export async function exigeLogin() {
  const funcionario = await getFuncionarioLogado();

  if (!funcionario) {
    throw new Error("NAO_AUTENTICADO");
  }

  return funcionario;
}

export async function exigeMaster() {
  const funcionario = await exigeLogin();

  if (funcionario.perfil !== "master") {
    throw new Error("SEM_PERMISSAO");
  }

  return funcionario;
}