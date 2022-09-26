import https from "https";
import { asyncExecute } from "./terminalUtils";

export function httpsPost({ body, ...options }: any) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: "POST",
        ...options,
      },
      (res) => {
        res.setEncoding("utf8");
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            const respData = JSON.parse(body);
            resolve(respData);
          } catch (error) {
            console.log({ body, options });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const getRequires = (code: string) =>
  code.match(/(?<=((= |=|\n* )require\(("|')))[^.].*?(?=("|')\))/g);
/**
 * checks if dependency is @google-cloud/... or @mui/...
 * @param dependency
 * @returns boolean
 */
const isGloballyScoped = (dependency: string) => !dependency.startsWith("@");
const removeVersion = (dependency: string) =>
  isGloballyScoped(dependency)
    ? dependency.split("@")[0]
    : dependency.split(/(@[^@]*)/)[1] ?? dependency;
const getPackageName = (dependency: string) =>
  isGloballyScoped(dependency)
    ? removeVersion(dependency).split("/")[0]
    : removeVersion(dependency).split("/").splice(0, 2).join("/");

const getVersion = (dependency: string) => {
  const sections = dependency.split("@");
  const index = isGloballyScoped(dependency) ? 1 : 2;
  return sections[index] ?? "latest";
};
export const getRequiredPackages = (code: string) =>
  code
    ? getRequires(code)?.map((req) => ({
        name: getPackageName(req),
        version: getVersion(req),
      })) ?? []
    : [];

export const installDependenciesIfMissing = async (
  code: string,
  name: string
) => {
  const requiredDependencies = getRequiredPackages(code);
  const packageJson = require(`../package.json`);
  const installedDependencies = Object.keys(packageJson.dependencies);
  const requiredDependenciesToInstall = requiredDependencies?.filter(
    (i) => !installedDependencies.includes(i.name)
  );
  const dependenciesString = requiredDependenciesToInstall.reduce(
    (acc, currDependency) => {
      return `${acc} ${currDependency.name}@${
        currDependency.version ?? "latest"
      }`;
    },
    ""
  );

  console.log(`Installing dependencies for ${name}: ${dependenciesString}`);
  const yarnStartTime = Date.now();
  const hasDependencies = dependenciesString.trim().length > 0;
  if (hasDependencies) {
    const success = await asyncExecute(`cd ..; yarn add ${dependenciesString}`);
    if (!success) {
      console.error("Dependencies could not be installed");
      throw new Error(
        `Cannot install dependencies for ${name}: ${dependenciesString}`
      );
    }
    console.log("Dependencies installed successfully");
  }
  const yarnFinishTime = Date.now();
  return {
    yarnStartTime,
    yarnFinishTime,
    hasDependencies,
    dependenciesString,
  };
};
