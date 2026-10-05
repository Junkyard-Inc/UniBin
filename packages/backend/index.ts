// ########################################################
//
// ########################################################
import figlet from "figlet";
import { sql } from "bun";

const server = Bun.serve({
  port: Number(process.env.BACKEND_PORT ?? 3001),
  routes: {
    "/": async () => {
      const [row] = await sql`SELECT current_database() AS db`;
      const banner = figlet.textSync(row.db);
      return new Response(`${banner}\nDatabase connected\n`);
    },
  },
});

console.log(`Listening on ${server.url}`);
