import { redirect } from "next/navigation";
import Link from "next/link";
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

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Funcionários
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Gerencie contas, perfis e permissões dos funcionários.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
            >
              Voltar
            </Link>
          </div>
        </section>

        <FuncionariosClient funcionarios={funcionarios} />
      </div>
    </main>
  );
}