import fs from "fs";

import { Lexer } from "./src/lexer.js";

(() => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Please provide a file path.");
    process.exit(1);
  }
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const keywords = ["let"];
    const lexer = new Lexer(source, keywords);
    const tokens = lexer.generate_tokens();
    if (lexer.has_error()) {
      console.error("Lexing errors occurred: ");
      lexer.get_errors().forEach((error) => {
        console.error(error.toString());
      });
    } else {
      console.log("Lexing successul!");
      tokens.forEach((token) => {
        console.log(token.toString());
      });
    }
  } catch (err) {
    console.error("Error reading the file:", err);
    process.exit(1);
  }
})();
