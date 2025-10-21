import { port } from "@template/common";
import { createServer } from "http";

createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/plain" });
	res.end("Hello, World!\n");
}).listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});
