import https from "https";
import { exec } from "child_process";
function execute(command: string, callback: any) {
  console.log(command);
  exec(command, function (error, stdout, stderr) {
    console.log({ error, stdout, stderr });
    callback(stdout);
  });
}

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
