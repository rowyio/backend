import https from "https";
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
