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

  peek_ahead(offset = 1) {
    return this.tokens[this.cursor + offset] || new Token("eof", "eof");
  }

  advance() {
    this.cursor++;
  }

  matches_token(type, value = null) {
    if (this.current_token().type !== type) {
      return false;
    }
    if (value !== null && this.current_token().value !== value) {
      return false;
    }
    return true;
  }

  expect(type, value = null) {
    if (!this.matches_token(type, value)) {
      this.report_error(
        UnexpectedTokenError,
        `Expected Token(${type}, ${value !== null ? value : "any"}), got ${this.current_token().to_string()}`,
      );
      return null;
    }
    const token = this.current_token();
    this.advance();
    return token;
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
      "=": 0,
      "||": 1,
      "&&": 2,
      "==": 3,
      "!=": 3,
      "<": 4,
      "<=": 4,
      ">": 4,
      ">=": 4,
      "+": 5,
      "-": 5,
      "*": 6,
      "/": 6,
      "::": 7,
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
    if (this.matches_token("keyword", "let")) {
      return this.parse_variable_declaration(false);
    }
    if (this.matches_token("identifier", "const")) {
      return this.parse_variable_declaration(true);
    }
    if (this.matches_token("keyword", "if")) {
      return this.parse_if_statement();
    }
    return this.parse_expression_statement();
  }

  parse_if_statement() {
    this.expect("keyword", "if");
    const condition = this.parse_expression();
    const then_branch = this.parse_block();
    let else_branch = null;
    if (this.matches_token("keyword", "else")) {
      this.advance();
      if (this.matches_token("keyword", "if")) {
        else_branch = this.parse_if_statement();
      } else {
        else_branch = this.parse_block();
      }
    }
    return this.new_node("if statement", {
      condition,
      then_branch,
      else_branch,
    });
  }

  parse_expression_statement() {
    const expr = this.parse_expression();
    const stmt = this.new_node("expression statement", expr);
    this.expect("symbol", ";");
    return stmt;
  }

  parse_variable_declaration(is_const) {
    if (is_const) {
      this.expect("identifier", "const");
    } else {
      this.expect("keyword", "let");
    }
    const identifier = this.expect("identifier");
    this.expect("symbol", "=");
    const initializer = this.parse_expression();
    this.expect("symbol", ";");
    if (identifier === null) {
      return this.new_node(
        "error",
        `Invalid ${is_const ? "const" : "variable"} declaration`,
      );
    }
    return this.new_node("variable declaration", {
      identifier: identifier.value,
      initializer,
      is_const,
    });
  }

  parse_expression(precedence = 0) {
    let left = this.parse_primary();
    while (true) {
      if (this.matches_token("operator", "::")) {
        left = this.parse_namespace_access(left);
        continue;
      }
      if (
        (this.current_token().type === "symbol" ||
          this.current_token().type === "operator") &&
        this.get_precedence(this.current_token().value) > precedence
      ) {
        const operator = this.current_token().value;
        this.advance();
        const right = this.parse_expression(this.get_precedence(operator));
        left = this.new_node("binary operation", { left, right, operator });
        continue;
      }
      break;
    }
    return left;
  }

  parse_namespace_access(namespace) {
    this.expect("operator", "::");
    const member = this.expect("identifier");
    if (member === null) {
      this.report_error(
        UnexpectedTokenError,
        "Expected identifier after namespace operator",
      );
      return this.new_node("error", "Invalid namespace access");
    }
    let access = this.new_node("namespace access", {
      namespace,
      member: member.value,
    });
    if (this.matches_token("symbol", "(")) {
      access = this.parse_function_call(access);
    }
    return access;
  }

  parse_primary() {
    const token = this.current_token();
    switch (token.type) {
      case "number":
        this.advance();
        return this.new_node("number literal", token.value);
      case "string":
        this.advance();
        return this.new_node("string literal", token.value);
      case "identifier": {
        this.advance();
        if (token.value === "true" || token.value === "false") {
          return this.new_node("boolean literal", token.value);
        }
        let identifier = this.new_node("identifier", token.value);
        if (this.matches_token("symbol", "(")) {
          identifier = this.parse_function_call(identifier);
        }
        return identifier;
      }
      case "symbol":
        if (token.value === "(") {
          if (
            this.peek_ahead().type === "symbol" &&
            this.peek_ahead().value === ")"
          ) {
            return this.parse_function_expression();
          }
          this.advance();
          const expr = this.parse_expression(0);
          if (!this.matches_token("symbol", ")")) {
            this.report_error(
              UnexpectedTokenError,
              `Expected closing parenthesis, got ${this.current_token().to_string()}`,
            );
            return this.new_node("error", "Missing closing parenthesis");
          }
          this.advance();
          return this.new_node("parenthesized expression", expr);
        }
      default:
        this.report_error(
          UnexpectedTokenError,
          `Unexpected token ${token.to_string()} when parsing expression`,
        );
        this.advance();
        return this.new_node("error", "Invalid expression");
    }
  }

  parse_function_expression() {
    const params = this.parse_parameter_list();
    if (!this.matches_token("operator", "->")) {
      this.report_error(
        UnexpectedTokenError,
        `Expected '->' after parameters, got ${this.current_token().to_string()}`,
      );
      return this.new_node("error", "Invalid function expression");
    }
    this.advance();
    const body = this.parse_block();
    return this.new_node("function expression", { params, body });
  }

  parse_parameter_list() {
    this.expect("symbol", "(");
    const params = [];
    if (this.matches_token("symbol", ")")) {
      this.advance();
      return params;
    }
    while (true) {
      const param = this.expect("identifier");
      if (param === null) {
        this.report_error(UnexpectedTokenError, "Expected parameter name");
        break;
      }
      params.push(param.value);
      if (this.matches_token("symbol", ",")) {
        this.advance();
      } else if (this.matches_token("symbol", ")")) {
        break;
      } else {
        this.report_error(
          UnexpectedTokenError,
          `Expected ',' or ')' in parameter list, got ${this.current_token().to_string()}`,
        );
        break;
      }
    }
    this.expect("symbol", ")");
    return params;
  }

  parse_block() {
    this.expect("symbol", "{");
    const statements = [];
    while (
      !this.matches_token("symbol", "}") &&
      !this.matches_token("eof", "eof")
    ) {
      statements.push(this.parse_statement());
    }
    this.expect("symbol", "}");
    return this.new_node("block statement", statements);
  }

  parse_function_call(callee) {
    this.expect("symbol", "(");
    const args = [];
    if (this.matches_token("symbol", ")")) {
      this.advance();
      return this.new_node("function call", { callee, args });
    }
    while (true) {
      const arg = this.parse_expression(0);
      args.push(arg);
      if (this.matches_token("symbol", ",")) {
        this.advance();
      } else if (this.matches_token("symbol", ")")) {
        break;
      } else {
        this.report_error(
          UnexpectedTokenError,
          `Expected ',' or ')' in function call, got ${this.current_token().to_string()}`,
        );
        return this.new_node("error", "Invalid function call");
      }
    }
    this.expect("symbol", ")");
    return this.new_node("function call", { callee, args });
  }
}
