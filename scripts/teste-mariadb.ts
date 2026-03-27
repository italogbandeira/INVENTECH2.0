import * as mariadb from "mariadb";

async function main() {
  const conn = await mariadb.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "Seduh@2000",
    database: "banco_de_dados_maquinas_gti",
    allowPublicKeyRetrieval: true,
  });

  const rows = await conn.query("SELECT 1 AS ok");
  console.log(rows);

  await conn.end();
}

main().catch((e) => {
  console.error("Erro no teste MariaDB:", e);
  process.exit(1);
});