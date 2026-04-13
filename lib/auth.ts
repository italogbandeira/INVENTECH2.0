import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Chave usada para assinar e validar os tokens JWT da aplicação.
 *
 * Em produção, o ideal é sempre definir JWT_SECRET no ambiente.
 * O valor fallback existe apenas para evitar quebra em desenvolvimento,
 * mas não deve ser usado em ambiente real.
 */
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "troque-essa-chave-em-producao"
);

/**
 * Nome do cookie que armazena o token de autenticação.
 *
 * Esse valor precisa ser o mesmo usado nas rotas de login/logout.
 */
export const AUTH_COOKIE = "auth_token";

/**
 * Estrutura mínima da sessão do funcionário autenticado.
 *
 * Esses dados são serializados dentro do JWT e depois lidos
 * pelo backend para identificar o usuário logado.
 */
export type SessaoFuncionario = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
};

/**
 * Cria um token JWT a partir dos dados do funcionário.
 *
 * Regras atuais:
 * - algoritmo HS256
 * - data de emissão automática
 * - expiração em 7 dias
 *
 * Esse token normalmente será salvo em cookie HTTP-only
 * após o login.
 */
export async function criarToken(funcionario: SessaoFuncionario) {
  return new SignJWT(funcionario)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

/**
 * Verifica se o token JWT é válido e extrai os dados da sessão.
 *
 * O payload vindo do JWT é convertido explicitamente para os tipos
 * esperados pela aplicação.
 */
export async function verificarToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET);

  return {
    id: Number(payload.id),
    nome: String(payload.nome),
    email: String(payload.email),
    perfil: String(payload.perfil),
  } satisfies SessaoFuncionario;
}

/**
 * Recupera o funcionário logado a partir do cookie da requisição.
 *
 * Fluxo:
 * 1. lê o cookie auth_token
 * 2. se não existir, retorna null
 * 3. se existir, tenta validar o JWT
 * 4. se falhar, retorna null
 *
 * Essa função é usada em rotas protegidas e helpers de sessão.
 */
export async function getFuncionarioLogado() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) return null;

  try {
    return await verificarToken(token);
  } catch {
    /**
     * Se o token estiver inválido, expirado ou malformado,
     * tratamos como usuário não autenticado.
     */
    return null;
  }
}

/**
 * Alias semântico para recuperar a sessão no servidor.
 *
 * Hoje apenas reaproveita getFuncionarioLogado(), mas mantém
 * um nome mais claro para uso em contextos server-side.
 */
export async function getSessaoServidor() {
  return await getFuncionarioLogado();
}

/**
 * Exige que exista um funcionário autenticado.
 *
 * Se não houver sessão válida, lança erro padronizado para a rota
 * chamadora tratar e devolver 401, redirecionamento ou outra resposta.
 */
export async function exigeLogin() {
  const funcionario = await getFuncionarioLogado();

  if (!funcionario) {
    throw new Error("NAO_AUTENTICADO");
  }

  return funcionario;
}

/**
 * Exige que o usuário autenticado tenha perfil master.
 *
 * Fluxo:
 * 1. garante que existe login válido
 * 2. verifica o perfil
 * 3. se não for master, lança erro padronizado
 */
export async function exigeMaster() {
  const funcionario = await exigeLogin();

  if (funcionario.perfil !== "master") {
    throw new Error("SEM_PERMISSAO");
  }

  return funcionario;
}