// ########################################################
// 
// ########################################################
import figlet from "figlet";

const server = Bun.serve({
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