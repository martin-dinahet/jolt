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

    // printing the source file
    console.log("File reading successful!");
    console.log(source);

    // lexing
    const lexer = new Lexer(source, keywords);
    const tokens = lexer.generate_tokens();
    if (lexer.has_errors()) {
      console.error("Lexing errors occurred: ");
      lexer.get_errors().forEach((error) => {
        console.error(error.toString());
      });
    } else {
      console.log("Lexing successful!");
      tokens.forEach((token) => {
        console.log(token.to_string());
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
      console.log("Parsing successful!");
      console.log(program.to_string());
    }
  } catch (err) {
    console.error("Error reading the file:", err);
    process.exit(1);
  }
})();
