// ########################################################
//
// ########################################################
import figlet from "figlet";
import { SQL } from "bun";

export const connection = new SQL(process.env.DATABASE_URL!);

const server = Bun.serve({
  port: Number(process.env.BACKEND_PORT ?? 3001),
  routes: {
    "/": async () => {
      const [row] = await connection`SELECT current_database() AS db`;
      const banner = figlet.textSync(row.db);
      return new Response(`${banner}\nDatabase connected\n`);
    },
  },
});

console.log(`Listening on ${server.url}`);

async function shutdown() {
  console.log('Shutting down...');
  await server.stop();       // stop accepting new requests
  await connection.close();  // then release the DB pool
  process.exit(0);
}

process.on('SIGINT', shutdown);   // Ctrl+C
process.on('SIGTERM', shutdown);  // docker stop, process managers
