import { Token } from "./token.js";
import { ASTNode } from "./astnode.js";
import { UnexpectedTokenError } from "./errors.js";

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.cursor = 0;
    this.errors = [];
    this.program_block = new ASTNode("block statement", []);
  }

  add_node(node) {
    this.program_block.value.push(node);
  }

  new_node(type, value) {
    return new ASTNode(type, value);
  }

  current_token() {
    return this.tokens[this.cursor] || new Token("eof", "eof");
  }

  advance() {
    this.cursor++;
  }

  report_error(error_class, message) {
    this.errors.push(new error_class(message));
  }

  get_errors() {
    return this.errors;
  }

  has_errors() {
    return this.errors.length > 0;
  }

  get_precedence(operator) {
    const precedences = {
      "+": 1,
      "-": 1,
      "*": 2,
      "/": 2,
    };
    return precedences[operator] || 0;
  }

  parse_program() {
    while (this.current_token().type !== "eof") {
      this.add_node(this.parse_statement());
    }
    this.add_node(this.new_node("end of file", {}));
    return this.program_block;
  }

  parse_statement() {
    return this.parse_expression();
  }

  parse_expression(precedence = 0) {
    let left = this.parse_literal();
    while (this.get_precedence(this.current_token().value) > precedence) {
      const operator = this.current_token().value;
      this.advance();
      const right = this.parse_expression(this.get_precedence(operator));
      left = this.new_node("binary operation", { left, right, operator });
    }
    return left;
  }

  parse_literal() {
    const token = this.current_token();
    this.advance();
    switch (token.type) {
      case "number":
        return this.new_node("number literal", token.value);
      case "string":
        return this.new_node("string literal", token.value);
      case "identifier":
        if (token.value === "true" || token.value === "false") {
          return this.new_node("boolean literal", token.value);
        }
        return this.new_node("identifier", token.value);
      default:
        this.report_error(
          UnexpectedTokenError,
          "unknown token when parsing literal",
        );
    }
  }
}
