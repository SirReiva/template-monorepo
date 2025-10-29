import { port } from "@template/common";
import { Application } from "@template/server-framework/class/application";
import { createServer } from "http";

const Log = (
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) => {
	const originalMethod = descriptor.value;
	descriptor.value = function (...args: any[]) {
		console.log(`Calling ${propertyKey} with arguments:`, args);
		const result = originalMethod.apply(this, args);
		console.log(`Result from ${propertyKey}:`, result);
		return result;
	};
	return descriptor;
};

type Greeting = {
	data: string;
};

export class Example {
	@Log
	static sayHello(name: string): Greeting {
		return { data: `Hello, ${name}!!!` };
	}
}

new Application().init();

createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/plain" });
	res.end(Example.sayHello("World"));
}).listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});
