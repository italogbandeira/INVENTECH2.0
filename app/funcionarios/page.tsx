import { redirect } from "next/navigation";
import { exigeMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FuncionariosClient from "./FuncionariosClient";

export default async function FuncionariosPage() {
  try {
    await exigeMaster();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NAO_AUTENTICADO") {
        redirect("/login");
      }

      if (error.message === "SEM_PERMISSAO") {
        redirect("/");
      }
    }

    redirect("/");
  }

  const funcionarios = await prisma.funcionario.findMany({
    orderBy: { nome: "asc" },
  });

  return <FuncionariosClient funcionarios={funcionarios} />;
}