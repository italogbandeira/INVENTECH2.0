import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

type UsuarioComTotal = {
  id: number;
  nome: string;
  login_email: string | null;
  login_maquina: string | null;
  totalMaquinas: number;
};

export async function GET(req: NextRequest) {
  try {
    await exigeLogin();

    const { searchParams } = new URL(req.url);

    const idParam = searchParams.get("id")?.trim();
    const nomeParam = searchParams.get("nome")?.trim();
    const setorParam = searchParams.get("setor")?.trim();

    let idsUsuariosPorSetor: number[] | null = null;

    if (setorParam) {
      const setores = await prisma.setores.findMany({
        where: {
          nome: {
            contains: setorParam,
          },
        },
        select: {
          id: true,
        },
      });

      const setorIds = setores.map((setor) => setor.id);

      if (setorIds.length === 0) {
        return NextResponse.json([]);
      }

      const maquinasDoSetor = await prisma.maquinas.findMany({
        where: {
          setor_id: {
            in: setorIds,
          },
          usuario_id: {
            not: null,
          },
        },
        select: {
          usuario_id: true,
        },
      });

      idsUsuariosPorSetor = Array.from(
        new Set(
          maquinasDoSetor
            .map((maquina) => maquina.usuario_id)
            .filter((id): id is number => typeof id === "number")
        )
      );

      if (idsUsuariosPorSetor.length === 0) {
        return NextResponse.json([]);
      }
    }

    const usuarios = await prisma.usuarios.findMany({
      where: {
        ...(idParam && !Number.isNaN(Number(idParam))
          ? { id: Number(idParam) }
          : {}),
        ...(nomeParam
          ? {
              nome: {
                contains: nomeParam,
              },
            }
          : {}),
        ...(idsUsuariosPorSetor
          ? {
              id: {
                in: idsUsuariosPorSetor,
              },
            }
          : {}),
      },
      orderBy: {
        nome: "asc",
      },
    });

    const usuarioIds = usuarios.map((usuario) => usuario.id);

    const maquinas = usuarioIds.length
      ? await prisma.maquinas.findMany({
          where: {
            usuario_id: {
              in: usuarioIds,
            },
          },
          select: {
            usuario_id: true,
          },
        })
      : [];

    const totalPorUsuario = maquinas.reduce<Record<number, number>>((acc, maquina) => {
      if (typeof maquina.usuario_id === "number") {
        acc[maquina.usuario_id] = (acc[maquina.usuario_id] || 0) + 1;
      }
      return acc;
    }, {});

    const resposta: UsuarioComTotal[] = usuarios.map((usuario) => ({
      ...usuario,
      totalMaquinas: totalPorUsuario[usuario.id] || 0,
    }));

    return NextResponse.json(resposta);
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao listar usuários:", error);
    return NextResponse.json(
      { erro: "Erro ao listar usuários." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const funcionario = await exigeLogin();

    const body = await req.json();

    const nome = body?.nome?.trim();
    const login_email = body?.login_email?.trim() || null;
    const login_maquina = body?.login_maquina?.trim() || null;

    if (!nome) {
      return NextResponse.json(
        { erro: "Nome é obrigatório." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuarios.create({
      data: {
        nome,
        login_email,
        login_maquina,
      },
    });

    await criarLogAuditoria({
      entidade: "usuario",
      entidadeId: usuario.id,
      acao: "criacao",
      funcionario: {
        id: funcionario.id,
        nome: funcionario.nome,
        email: funcionario.email,
      },
      descricao: `Criou o usuário ${usuario.nome}`,
      antes: null,
      depois: {
        id: usuario.id,
        nome: usuario.nome,
        login_email: usuario.login_email,
        login_maquina: usuario.login_maquina,
      },
    });

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { erro: "Erro ao criar usuário." },
      { status: 500 }
    );
  }
}