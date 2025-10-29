import { port } from "@template/common";
import type { ApplicationModule } from "../interface/application-module";
import type { Type } from "../interface/utils";

export class Application {
	private moduleInstances: ApplicationModule[] = [];

	addModule<T extends Type<ApplicationModule>>(
		Clazz: T,
		options: () => ConstructorParameters<T>
	): this;
	addModule<T extends Type<ApplicationModule>>(
		Clazz: T,
		...options: ConstructorParameters<T>
	): this;
	addModule<T extends Type<ApplicationModule>>(
		Clazz: T,
		...options: ConstructorParameters<T> | [() => ConstructorParameters<T>]
	) {
		const opts = typeof options[0] === "function" ? options[0]() : options;
		this.moduleInstances.push(new Clazz(...opts));
		return this;
	}

	async init() {
		await Promise.all(
			this.moduleInstances.map((module) => module.init?.(this))
		);
		console.log("Application: init", port);
	}
}
