import child from "child_process";

export const getGCPEmail = () =>
  new Promise(async (resolve, reject) => {
    child.exec("gcloud auth list", async function (error, stdout, stderr) {
      if (error) reject(error);
      const match = stdout.match(/(?=\*).*/);
      if (match) resolve(match[0].replace("*", "").trim());
      else reject(new Error("No match"));
    });
  });

export const updateConfig = (key: string, value: any) => {
  let rowyService = require("../../rowyConfig.json");
  rowyService[key] = value;
  require("fs").writeFileSync(
    "../../rowyConfig.json",
    JSON.stringify(rowyService, null, 2)
  );
};

export const getProjectId = () => process.env.GOOGLE_CLOUD_PROJECT;
