// ########################################################
// 
// ########################################################
import figlet from "figlet";

const server = Bun.serve({
  hostname: process.env.BACKEND_HOST ?? "127.0.0.1",
  port: Number(process.env.BACKEND_PORT ?? 3001),
  routes: {
    "/": () => new Response('Bun!'),
    "/figlet": () => {
      const body = figlet.textSync('Bun!');
      return new Response(body);
    }
  }
});

console.log(`Listening on ${server.url}`);