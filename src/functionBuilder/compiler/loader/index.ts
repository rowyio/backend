import { db } from "../../../firebaseConfig";
import {
  serialiseDerivativeColumns,
  serialiseDefaultValueColumns,
  serialiseDocumentSelectColumns,
  serialiseExtension,
} from "./serialisers";
import { TriggerPathType, TableConfig } from "./types";
const fs = require("fs");
const beautify = require("js-beautify").js;

export const getConfigFromTableSchema = async (
  schemaDocPath: string,
  streamLogger
) => {
  await streamLogger.info("getting schema...");
  const schemaDoc = await db.doc(schemaDocPath).get();
  const schemaData = schemaDoc.data();
  try {
    if (!schemaData) throw new Error("no schema found");
    const derivativeColumns = Object.values(schemaData.columns).filter(
      (col: any) => col.type === "DERIVATIVE"
    );
    const defaultValueColumns = Object.values(schemaData.columns).filter(
      (col: any) => Boolean(col.config?.defaultValue)
    );

    const documentSelectColumns = Object.values(schemaData.columns).filter(
      (col: any) => col.type === "DOCUMENT_SELECT" && col.config?.trackedFields
    );

    const extensions = schemaData.extensionObjects;
    // generate field types from table meta data
    const fieldTypes = Object.keys(schemaData.columns).reduce((acc, cur) => {
      const field = schemaData.columns[cur];
      let fieldType = field.type;
      if (fieldType === "DERIVATIVE") {
        fieldType = field.config.renderFieldType;
      }
      return {
        [cur]: fieldType,
        ...acc,
      };
    }, {});

    const config = {
      derivativeColumns,
      defaultValueColumns,
      documentSelectColumns,
      fieldTypes,
      extensions,
    };
    await Promise.all(
      Object.keys(config).map(async (key) =>
        streamLogger.info(`${key}: ${JSON.stringify(config[key])}`)
      )
    );
    return config;
  } catch (error: any) {
    streamLogger.error(error.message);
    return false;
  }
};

// examples of trigger paths
// collection Type:
// "collection/{docId}"
// "collection/documentId/subCollection/{docId}"

// collectionGroup Type:
// '{col}/{doc1}/collection/{doc2}'
// '{col1}/{doc1}/{col2}/{doc2}/collection/{doc3}'

// subCollection Type:
// "collection/{parentDoc}/subCollection/{docId}"
// "collection/{parentDoc1}/subCollection1/{parentDoc2}/subCollection1/{docId}"
// "col1/doc1/col2/{parentDoc}/subCollection/{docId}"
const getTriggerType = (triggerPath: string): TriggerPathType => {
  const triggerPathParts = triggerPath.split("/");
  // collectionType only has one variable
  const numberOfVariables = triggerPathParts.filter((part) =>
    part.startsWith("{")
  ).length;
  if (numberOfVariables === 1) return "collection";
  // subCollection type has variables in even parts only
  const numberOfVariablesInEvenParts = triggerPathParts.filter(
    (part, index) => index % 2 === 0 && part.startsWith("{")
  ).length;
  const numberOfVariablesInOddParts = triggerPathParts.filter(
    (part, index) => index % 2 !== 0 && part.startsWith("{")
  ).length;
  if (numberOfVariablesInOddParts === 0 && numberOfVariablesInEvenParts > 1)
    return "subCollection";
  else return "collectionGroup";
};

export const combineConfigs = (configs: any[]) =>
  configs.reduce(
    (acc, cur: TableConfig) => {
      const {
        derivativeColumns,
        defaultValueColumns,
        documentSelectColumns,
        fieldTypes,
        extensions,
      } = cur;
      return {
        derivativeColumns: [...acc.derivativeColumns, ...derivativeColumns],
        defaultValueColumns: [
          ...acc.defaultValueColumns,
          ...defaultValueColumns,
        ],
        documentSelectColumns: [
          ...acc.documentSelectColumns,
          ...documentSelectColumns,
        ],
        fieldTypes: { ...acc.fieldTypes, ...fieldTypes },
        extensions: extensions
          ? [...acc.extensions, ...extensions]
          : acc.extensions,
      };
    },
    {
      derivativeColumns: [],
      defaultValueColumns: [],
      documentSelectColumns: [],
      fieldTypes: {},
      extensions: [],
    }
  );

export const generateFile = async (configData) => {
  const {
    derivativeColumns,
    defaultValueColumns,
    documentSelectColumns,
    fieldTypes,
    extensions,
    triggerPath,
    functionName,
  } = configData;
  const data = {
    fieldTypes: JSON.stringify(fieldTypes),
    triggerPath: JSON.stringify(triggerPath),
    functionName: JSON.stringify(functionName),
    derivativesConfig: serialiseDerivativeColumns(derivativeColumns),
    defaultValueConfig: serialiseDefaultValueColumns(defaultValueColumns),
    documentSelectConfig: serialiseDocumentSelectColumns(documentSelectColumns),
    extensionsConfig: serialiseExtension(extensions),
  };
  const fileData = Object.keys(data).reduce((acc, currKey) => {
    return `${acc}\nexport const ${currKey} = ${data[currKey]}`;
  }, ``);
  const serializedConfig = beautify(fileData, { indent_size: 2 });
  await db
    .doc(`_rowy_/settings/functions/${functionName}`)
    .update({ serializedConfig });
  const path = require("path");
  fs.writeFileSync(
    path.resolve(__dirname, "../../functions/src/functionConfig.ts"),
    serializedConfig
  );
};
