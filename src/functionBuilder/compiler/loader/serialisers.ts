import { IExtension } from "./types";
import { getRequiredPackages } from "../../../utils";

const removeInlineVersioning = (code: string) =>
  code.replace(
    /(?:require\(.*)@\d+\.\d+\.\d+/g,
    (capture) => capture.split("@")[0]
  );

const removeTrailingColon = (code: string) => {
  return code.replace(/\s*;\s*$/, "");
};

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
          extensionBody: ${removeTrailingColon(
            removeInlineVersioning(extension.extensionBody).replace(
              /^.*:\s*\w*Body\s*=/,
              ""
            )
          )}
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
      ? derivativeFn.replace(/(.|\r\n)*=>/, "")
      : `{\n${script}\n}`;
    return `${acc}{\nfieldName:'${currColumn.key}'
    ,requiredPackages:${JSON.stringify(getRequiredPackages(functionBody))}
    ,evaluate:async ({row,ref,db,auth,storage,utilFns,logging}) =>
      ${removeTrailingColon(removeInlineVersioning(functionBody))}
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
        dynamicValueFn.replace(/(.|\r\n)*=>/, "") ?? `{\n${script}\n}`;
      return `${acc}{\nfieldName:'${currColumn.key}',
    type:"${type}",
    requiredPackages:${JSON.stringify(getRequiredPackages(functionBody))},
    script:async ({row,ref,db,auth,utilFns,logging}) => {
      ${removeTrailingColon(removeInlineVersioning(functionBody))}
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
