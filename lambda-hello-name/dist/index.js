var __defProp = Object.defineProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
__markAsModule(exports);
__export(exports, {
  handler: () => handler
});
var handler = async (event) => {
  const queries = event.queryStringParameters;
  let name = "there";
  if (queries !== null && queries !== void 0) {
    if (queries["name"]) {
      name = queries["name"];
    }
  }
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    },
    body: `<p>Hello ${name}!</p>`
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
