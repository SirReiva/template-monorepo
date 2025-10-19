import { Application } from "@template/server-framework/class/application";

class Test {
	constructor(public readonly a: number, public readonly b: string) {}

	async init(app: Application) {}
}

const application = new Application();

application.addModule(Test, () => [1, "2"] as const);

await application.init();
