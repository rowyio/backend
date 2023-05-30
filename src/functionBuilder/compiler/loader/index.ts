import { db } from "../../../firebaseConfig";
import {
  serialiseDefaultValueColumns,
  serialiseDerivativeColumns,
  serialiseDocumentSelectColumns,
  serialiseExtension,
} from "./serialisers";
import { TableConfig } from "./types";
const fs = require("fs");
const beautify = require("js-beautify").js;

export const getConfigFromTableSchema = async (
  schemaDocPath: string,
  streamLogger
) => {
  const schemaDoc = await db.doc(schemaDocPath).get();
  const schemaData = schemaDoc.data();
  try {
    if (!schemaData) throw new Error("no schema found");
    const columnsArray = Object.values(schemaData.columns);
    const derivativeColumns = columnsArray.filter(
      (col: any) =>
        col.type === "DERIVATIVE" &&
        col.config?.listenerFields &&
        col.config?.listenerFields.length > 0
    );
    const defaultValueColumns = columnsArray.filter((col: any) =>
      Boolean(col.config?.defaultValue)
    );

    const documentSelectColumns = columnsArray.filter(
      (col: any) => col.type === "DOCUMENT_SELECT" && col.config?.trackedFields
    );

    const extensions = schemaData.extensionObjects ?? [];
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

    const runtimeOptions = schemaData.runtimeOptions ?? {};

    const config: TableConfig = {
      derivativeColumns,
      defaultValueColumns,
      documentSelectColumns,
      fieldTypes,
      extensions,
      runtimeOptions,
      tableSchema: schemaData,
    };
    if (schemaData.searchIndex) {
      config.searchIndex = {
        id: schemaData.searchIndex,
        fields: columnsArray.map((c: any) => c.key),
      };
    }

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

export const combineConfigs = (configs: any[]) =>
  configs.reduce(
    (acc, cur: TableConfig) => {
      const {
        derivativeColumns,
        defaultValueColumns,
        documentSelectColumns,
        fieldTypes,
        extensions,
        searchIndex,
        runtimeOptions,
        tableSchema,
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
        searchIndices: searchIndex
          ? [...acc.searchIndices, searchIndex]
          : acc.searchIndices,
        runtimeOptions,
        tableSchema,
      };
    },
    {
      derivativeColumns: [],
      defaultValueColumns: [],
      documentSelectColumns: [],
      fieldTypes: {},
      extensions: [],
      searchIndices: [],
    }
  );

export const generateFile = async (configData, buildFolderTimestamp) => {
  const {
    derivativeColumns,
    defaultValueColumns,
    documentSelectColumns,
    searchIndices,
    fieldTypes,
    extensions,
    triggerPath,
    functionName,
    projectId,
    region,
    searchHost,
    runtimeOptions,
    tableSchema,
  } = configData;
  const serializedConfigData = {
    fieldTypes: JSON.stringify(fieldTypes),
    triggerPath: JSON.stringify(triggerPath),
    functionName: JSON.stringify(functionName),
    derivativesConfig: serialiseDerivativeColumns(
      derivativeColumns,
      buildFolderTimestamp
    ),
    defaultValueConfig: serialiseDefaultValueColumns(
      defaultValueColumns,
      buildFolderTimestamp
    ),
    documentSelectConfig: serialiseDocumentSelectColumns(documentSelectColumns),
    extensionsConfig: serialiseExtension(extensions, buildFolderTimestamp),
    runtimeOptions: JSON.stringify({
      serviceAccount: `rowy-functions@${projectId}.iam.gserviceaccount.com`,
      ...runtimeOptions,
    }),
    tableSchema: JSON.stringify(tableSchema),
    region: JSON.stringify(region),
    searchHost: JSON.stringify(searchHost),
    searchIndices: JSON.stringify(searchIndices),
  };
  const baseFile = `import fetch from "node-fetch";\n import rowy from "./rowy";\n`;
  const fileData = Object.keys(serializedConfigData).reduce((acc, currKey) => {
    return `${acc}\nexport const ${currKey} = ${serializedConfigData[currKey]}`;
  }, ``);
  const serializedConfig = beautify(baseFile + fileData, { indent_size: 2 });
  const path = require("path");
  fs.writeFileSync(
    path.resolve(
      __dirname,
      `../../builds/${buildFolderTimestamp}/src/functionConfig.ts`
    ),
    serializedConfig
  );
  return Promise.all([
    db
      .doc(`_rowy_/settings/functions/${functionName}`)
      .update({ serializedConfig, configData }),
    db.collection(`_rowy_/settings/functions/${functionName}/history`).add({
      serializedConfig,
      configData,
    }),
  ]);
};
