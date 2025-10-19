import type { Application } from "../class/application";
import type { Type } from "./utils";

export interface ApplicationModule {
	init?(app: Application): Promise<void>;
}

export type ApplicationModuleInit<T extends ApplicationModule = any> = {
	type: Type<T>;
	options:
		| ConstructorParameters<Type<T>>
		| ((env: any) => ConstructorParameters<Type<T>>);
};
