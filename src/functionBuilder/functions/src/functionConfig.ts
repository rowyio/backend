export const fieldTypes = {
  email: "EMAIL",
  action: "ACTION",
  shortText: "SIMPLE_TEXT",
  connectTable: "DOCUMENT_SELECT",
  url: "URL",
  phone: "PHONE_NUMBER",
  connectSerivce: "SERVICE_SELECT",
  longText: "LONG_TEXT",
  subtable: "SUB_TABLE",
  dateTime: "DATE_TIME",
  singleSelect: "SINGLE_SELECT",
  image: "IMAGE",
  number: "NUMBER",
  color: "COLOR",
  slider: "SLIDER",
  date: "DATE",
  derivative: "SIMPLE_TEXT",
  json: "JSON",
  percentage: "PERCENTAGE",
  status: "STATUS",
  code: "CODE",
  multiSelect: "MULTI_SELECT",
  rating: "RATING",
  toggle: "CHECK_BOX",
  file: "FILE",
  id: "ID",
  duration: "DURATION",
  _updatedBy: "USER",
  table2Only: "SIMPLE_TEXT",
  subTableTest: "SUB_TABLE",
};
export const triggerPath = "demoAllFieldTypes/{docId}";
export const functionName = "demoAllFieldTypes";
export const derivativesConfig = [
  {
    fieldName: "derivative",
    evaluate: async ({ row, ref, db, auth, storage, utilFns }) => {
      if (row.toggle) return "toggle is on";
      if (row.toggle === false) return "toggle is off";
      else return "toggle is not set";
    },
    listenerFields: ["toggle"],
  },
];
export const defaultValueConfig = [
  {
    fieldName: "toggle",
    type: "dynamic",
    script: async ({ row, ref, db, auth, utilFns }) => {
      return Math.random() < 0.5;
    },
  },
  {
    fieldName: "table2Only",
    type: "dynamic",
    script: async ({ row, ref, db, auth, utilFns }) => {
      return "test";
    },
  },
];
export const documentSelectConfig = [
  {
    fieldName: "connectTable",
    trackedFields: ["signedUp", "firstName", "email"],
  },
];
export const extensionsConfig = [
  {
    name: "email",
    type: "sendgridEmail",
    triggers: ["update"],
    conditions: async ({ row, change }) => {
      // feel free to add your own code logic here
      return true;
    },
    requiredFields: ["email", "shortText"],
    extensionBody: async ({ row, db, change, ref }) => {
      // feel free to add your own code logic here

      return {
        from: "Name<example@domain.com>", // send from field
        personalizations: [
          {
            to: [
              {
                name: "",
                email: "",
              },
            ], // recipient
            dynamic_template_data: {}, // template parameters
          },
        ],
        template_id: "", // sendgrid template ID
        categories: [], // helper info to categorise sendgrid emails
      };
    },
  },
];
