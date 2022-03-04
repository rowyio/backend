import { IExtension } from "./types";
const getRequires = (code: string) =>
  code.match(/(?<=((= |=)require\(("|')))[^.].*?(?=("|')\))/g);
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
const getRequiredPackages = (code: string) =>
  code
    ? getRequires(code)?.map((req) => ({
        name: getPackageName(req),
        version: getVersion(req),
      })) ?? []
    : [];

/* Convert extension objects into a single readable string */
export const serialiseExtension = (extensions: IExtension[]): string =>
  "[" +
  extensions
    .filter((extension) => extension.active)
    .map(
      (extension) => `{
          name: "${extension.name}",
          type: "${extension.type}",
          triggers: [${extension.triggers
            .map((trigger) => `"${trigger}"`)
            .join(", ")}],
          conditions: ${extension.conditions
            .replace(/^.*:\s*Condition\s*=/, "")
            .replace(/\s*;\s*$/, "")},
          requiredFields: [${extension.requiredFields
            ?.map((field) => `"${field}"`)
            .join(", ")}],
            trackedFields: [${extension.trackedFields
              ?.map((field) => `"${field}"`)
              .join(", ")}],
            requiredPackages:${JSON.stringify(
              getRequiredPackages(extension.extensionBody)
            )},
          extensionBody: ${extension.extensionBody
            .replace(
              /(?:require\(.*)@\d+\.\d+\.\d+/g,
              (capture) => capture.split("@")[0]
            )
            .replace(/^.*:\s*\w*Body\s*=/, "")
            .replace(/\s*;\s*$/, "")}
        }`
    )
    .join(",") +
  "]";

/* convert derivative columns into a readable string */
export const serialiseDerivativeColumns = (derivativeColumns: any[]): string =>
  `[${derivativeColumns.reduce((acc, currColumn: any) => {
    const { derivativeFn, script, listenerFields } = currColumn.config;
    if (listenerFields.includes(currColumn.key))
      throw new Error(
        `${currColumn.key} derivative has its own key as a listener field`
      );
    const functionBody = derivativeFn
      ? derivativeFn.replace(/^.*=>/, "")
      : `{\n${script}\n}`;
    return `${acc}{\nfieldName:'${currColumn.key}'
    ,requiredPackages:${JSON.stringify(getRequiredPackages(functionBody))}
    ,evaluate:async ({row,ref,db,auth,storage,utilFns}) =>
      ${functionBody.replace(
        /(?:require\(.*)@\d+\.\d+\.\d+/g,
        (capture) => capture.split("@")[0]
      )}
  ,\nlistenerFields:[${listenerFields
    .map((fieldKey: string) => `"${fieldKey}"`)
    .join(",\n")}]},\n`;
  }, "")}]`;

export const serialiseDefaultValueColumns = (
  defaultValueColumns: any[]
): string =>
  `[${defaultValueColumns.reduce((acc, currColumn: any) => {
    const { dynamicValueFn, script, type, value } =
      currColumn.config.defaultValue;
    if (type === "static") {
      return `${acc}{\nfieldName:'${currColumn.key}',
    type:"${type}",
    value:${typeof value === "string" ? `"${value}"` : JSON.stringify(value)},
   },\n`;
    } else if (type === "dynamic") {
      const functionBody =
        dynamicValueFn.replace(/^.*=>/, "") ?? `{\n${script}\n}`;
      return `${acc}{\nfieldName:'${currColumn.key}',
    type:"${type}",
    requiredPackages:${JSON.stringify(getRequiredPackages(functionBody))},
    script:async ({row,ref,db,auth,utilFns}) => {
      ${functionBody.replace(
        /(?:require\(.*)@\d+\.\d+\.\d+/g,
        (capture) => capture.split("@")[0]
      )}
  },
   },\n`;
    } else {
      return `${acc}{\nfieldName:'${currColumn.key}',
    type:"${type}"
   },\n`;
    }
  }, "")}]`;

export const serialiseDocumentSelectColumns = (
  documentSelectColumns: any[]
): string =>
  `[${documentSelectColumns.reduce((acc, currColumn: any) => {
    return `${acc}{\nfieldName:'${
      currColumn.key
    }',\ntrackedFields:[${currColumn.config.trackedFields
      .map((fieldKey: string) => `"${fieldKey}"`)
      .join(",\n")}]},\n`;
  }, "")}]`;
