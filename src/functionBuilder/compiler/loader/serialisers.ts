import * as fs from "fs";
import * as path from "path";
import { IExtension } from "./types";
import { getRequiredPackages } from "../../../utils";
import { transpile } from "../../utils";
const headerImports = `import rowy from '../rowy';\n import fetch from 'node-fetch';\n`;
const removeInlineVersioning = (code: string) =>
  code.replace(
    /(?:require\(.*)@\d+\.\d+\.\d+/g,
    (capture) => capture.split("@")[0]
  );

const removeTrailingColon = (code: string) => {
  return code.replace(/\s*;\s*$/, "");
};

/* Convert extension objects into a single readable string */
export const serialiseExtension = (
  extensions: IExtension[],
  buildFolderTimestamp
): string =>
  "[" +
  extensions
    .filter((extension) => extension.active)
    .map((extension, i) => {
      const extensionBody = transpile(
        headerImports,
        removeInlineVersioning(extension.extensionBody),
        "",
        "extensionBody"
      );

      // Write the derivative function to a file.
      fs.writeFileSync(
        path.resolve(
          __dirname,
          `../../builds/${buildFolderTimestamp}/src/extensions/${extension.name}_${i}_extensionBody.js`
        ),
        extensionBody
      );

      const conditions = transpile(
        headerImports,
        removeInlineVersioning(extension.conditions),
        "",
        "condition"
      );
      fs.writeFileSync(
        path.resolve(
          __dirname,
          `../../builds/${buildFolderTimestamp}/src/extensions/${extension.name}_${i}_conditions.js`
        ),
        conditions
      );
      return `{
          name: "${extension.name}",
          type: "${extension.type}",
          triggers: [${extension.triggers
            .map((trigger) => `"${trigger}"`)
            .join(", ")}],
          requiredFields: [${extension.requiredFields
            ?.map((field) => `"${field}"`)
            .join(", ")}],
            trackedFields: [${extension.trackedFields
              ?.map((field) => `"${field}"`)
              .join(", ")}],
          \/\/ extensionBody:require("./extensions/${
            extension.name
          }_${i}_extensionBody"),
          \/\/ conditions:require("./extensions/${
            extension.name
          }_${i}_conditions"),
          requiredPackages:${JSON.stringify(
            getRequiredPackages(extension.extensionBody)
          )}
        }`;
    })
    .join(",") +
  "]";

/* convert derivative columns into a readable string */
export const serialiseDerivativeColumns = (
  derivativeColumns: any[],
  buildFolderTimestamp: string
): string =>
  `[${derivativeColumns.reduce((acc, currColumn: any) => {
    const { derivativeFn, script, listenerFields } = currColumn.config;
    if (listenerFields.includes(currColumn.key)) {
      throw new Error(
        `${currColumn.key} derivative has its own key as a listener field`
      );
    }

    const functionBody = transpile(
      headerImports,
      derivativeFn,
      script,
      "derivative"
    );

    // Write the derivative function to a file.
    fs.writeFileSync(
      path.resolve(
        __dirname,
        `../../builds/${buildFolderTimestamp}/src/derivatives/${currColumn.key}.js`
      ),
      functionBody
    );

    return `${acc}{\nfieldName:'${currColumn.key}'
    ,requiredPackages:${JSON.stringify(getRequiredPackages(functionBody))},
    \/\/ evaluate:require("./derivatives/${currColumn.key}"),
    \nlistenerFields:[${listenerFields
      .map((fieldKey: string) => `"${fieldKey}"`)
      .join(",\n")}]},\n`;
  }, "")}]`;

export const serialiseDefaultValueColumns = (
  defaultValueColumns: any[],
  buildFolderTimestamp: string
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
      const functionBody = transpile(
        headerImports,
        dynamicValueFn,
        script,
        "dynamicValueFn"
      );

      const dir = path.resolve(
        __dirname,
        `../../builds/${buildFolderTimestamp}/src/initialize`
      );

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      // Write the dynamic value function to a file.
      fs.writeFileSync(
        path.resolve(
          __dirname,
          `../../builds/${buildFolderTimestamp}/src/initialize/${currColumn.key}.js`
        ),
        removeInlineVersioning(functionBody)
      );

      return `${acc}{\nfieldName:'${currColumn.key}',
    type:"${type}",
    \/\/ script:require("./initialize/${currColumn.key}"),
    requiredPackages:${JSON.stringify(getRequiredPackages(functionBody))},
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
