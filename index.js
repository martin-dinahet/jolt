import fs from "fs";

import { Lexer } from "./src/lexer.js";
import { Parser } from "./src/parser.js";

(() => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Please provide a file path.");
    process.exit(1);
  }
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const keywords = fs.readFileSync("./keywords.txt", "utf-8").split("\n");

    // lexing
    const lexer = new Lexer(source, keywords);
    const tokens = lexer.generate_tokens();
    if (lexer.has_errors()) {
      console.error("Lexing errors occurred: ");
      lexer.get_errors().forEach((error) => {
        console.error(error.toString());
      });
    }

    // parsing
    const parser = new Parser(tokens);
    const program = parser.parse_program();
    if (parser.has_errors()) {
      console.error("Parsing error occurred: ");
      parser.get_errors().forEach((error) => {
        console.error(error.toString());
      });
    } else {
      fs.writeFileSync("ast.json", JSON.stringify(program, null, 2), "utf-8");
      console.log();
    }
  } catch (err) {
    console.error("Error reading the file:", err);
    process.exit(1);
  }
})();
