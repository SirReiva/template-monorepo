//@ts-check
import eresolve from "enhanced-resolve";
import figlet from "figlet";
import { rainbow } from 'gradient-string';
import fs from "node:fs";
import { isBuiltin } from "node:module";
import { dirname, resolve as fsResolve } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const projectName = `@${packageJson.name}`;
const version = packageJson.version;

const baseURL = pathToFileURL(cwd() + "/").href;

export async function initialize({ packageName }) {
  figlet(`${projectName}/${packageName}#${version}`, (_, text = '') => console.log(rainbow.multiline(text)));
} 


/**
 * @param {String} specifier
 * @param {*} context
 * @param {*} next
 * @returns
 */
export async function resolve(specifier, context, next) {
  let { parentURL = baseURL } = context;

  if (
    isBuiltin(specifier) ||
    (!specifier.startsWith("./") &&
      !specifier.startsWith("../") &&
      !specifier.startsWith(projectName))
  ) {
    return next(specifier, context);
  }

  const resolver = eresolve.ResolverFactory.createResolver({
    extensions: [".js", ".mjs"],
    fileSystem: fs,
  });

  if (specifier.startsWith("file://")) {
    specifier = fileURLToPath(specifier);
  }

  if (specifier.startsWith(projectName)) {
    specifier = specifier.replace(projectName, fsResolve(cwd(), "./dist"));
    parentURL = pathToFileURL(fsResolve(cwd(), "./dist/common"));
  }

  const parentPath = fileURLToPath(parentURL);
  try {
    const resolution = await new Promise((res, rej) => {
      resolver.resolve(
        {},
        dirname(parentPath),
        specifier,
        {},
        (err, result) => {
          if (err) {
            rej(err);
            return;
          }
          if (!result) rej(new Error("File Not found"));
          res(result);
        }
      );
    });
    const url = pathToFileURL(resolution).href;
    return next(url, context);
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      error.code = "ERR_MODULE_NOT_FOUND";
    }
    error.specifier = specifier;
    throw error;
  }
}
