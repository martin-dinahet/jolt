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
    return this.program_block;
  }

  parse_statement() {
    if (this.matches_token("keyword", "let")) {
      return this.parse_variable_declaration(false);
    }
    if (this.matches_token("keyword", "const")) {
      return this.parse_variable_declaration(true);
    }
    if (this.matches_token("keyword", "if")) {
      return this.parse_if_statement();
    }
    if (this.matches_token("keyword", "return")) {
      return this.parse_return_statement();
    }
    if (this.matches_token("keyword", "for")) {
      return this.parse_for_statement();
    }
    if (this.matches_token("keyword", "while")) {
      return this.parse_while_statement();
    }
    if (this.matches_token("keyword", "break")) {
      return this.parse_break_statement();
    }
    if (this.matches_token("keyword", "continue")) {
      return this.parse_continue_statement();
    }
    if (this.matches_token("keyword", "struct")) {
      return this.parse_struct_declaration();
    }
    if (this.matches_token("keyword", "impl")) {
      return this.parse_impl_declaration();
    }
    return this.parse_expression_statement();
  }

  parse_struct_declaration() {
    this.expect("keyword", "struct");
    const name = this.expect("identifier");
    if (name === null) {
      this.report_error(UnexpectedTokenError, "Expected struct name");
      return this.new_node("error", "Invalid struct declaration");
    }

    this.expect("symbol", "{");

    const fields = [];

    // Parse fields
    while (
      !this.matches_token("symbol", "}") &&
      !this.matches_token("eof", "eof")
    ) {
      const field_name = this.expect("identifier");
      if (field_name === null) {
        this.report_error(UnexpectedTokenError, "Expected field name");
        break;
      }

      this.expect("symbol", ":");

      const field_type = this.parse_type();

      this.expect("symbol", ";");

      fields.push({
        name: field_name.value,
        type: field_type,
      });
    }

    this.expect("symbol", "}");

    // Handle optional semicolon after struct declaration
    if (this.matches_token("symbol", ";")) {
      this.advance();
    }

    return this.new_node("struct_declaration", {
      name: name.value,
      fields,
    });
  }

  parse_impl_declaration() {
    this.expect("keyword", "impl");
    const struct_name = this.expect("identifier");
    if (struct_name === null) {
      this.report_error(
        UnexpectedTokenError,
        "Expected struct name after impl",
      );
      return this.new_node("error", "Invalid impl declaration");
    }

    this.expect("symbol", "{");

    const methods = [];

    // Parse methods
    while (
      !this.matches_token("symbol", "}") &&
      !this.matches_token("eof", "eof")
    ) {
      const method_name = this.expect("identifier");
      if (method_name === null) {
        this.report_error(UnexpectedTokenError, "Expected method name");
        break;
      }

      this.expect("symbol", ":");

      // Parse method signature and body
      const params = this.parse_parameter_list();

      // Parse return type
      let return_type = null;
      if (this.matches_token("operator", "->")) {
        this.advance();
        return_type = this.parse_type();
      } else {
        this.report_error(
          UnexpectedTokenError,
          `Expected '->' after parameters, got ${this.current_token().to_string()}`,
        );
        return this.new_node("error", "Invalid method declaration");
      }

      const body = this.parse_block();

      // Handle optional semicolon after method
      if (this.matches_token("symbol", ";")) {
        this.advance();
      }

      methods.push({
        name: method_name.value,
        params,
        return_type,
        body,
      });
    }

    this.expect("symbol", "}");

    // Handle optional semicolon after impl declaration
    if (this.matches_token("symbol", ";")) {
      this.advance();
    }

    return this.new_node("impl_declaration", {
      struct_name: struct_name.value,
      methods,
    });
  }

  parse_while_statement() {
    this.expect("keyword", "while");

    // Parse the condition expression
    const condition = this.parse_expression();

    // Parse the loop body
    const body = this.parse_block();

    // Handle optional semicolon after block
    if (this.matches_token("symbol", ";")) {
      this.advance();
    }

    return this.new_node("while_statement", {
      condition,
      body,
    });
  }

  parse_for_statement() {
    this.expect("keyword", "for");

    // Only handle for-in loops
    if (
      this.matches_token("keyword", "const") ||
      this.matches_token("keyword", "let")
    ) {
      const is_const = this.matches_token("keyword", "const");
      this.advance();
      const identifier = this.expect("identifier");

      if (this.matches_token("keyword", "in")) {
        // This is a for-in loop
        this.advance(); // Consume 'in' token
        const iterable = this.parse_expression();
        const body = this.parse_block();

        // Handle optional semicolon after block
        if (this.matches_token("symbol", ";")) {
          this.advance();
        }

        return this.new_node("for_in_statement", {
          identifier: identifier.value,
          is_const,
          iterable,
          body,
        });
      } else {
        this.report_error(
          UnexpectedTokenError,
          `Expected 'in' after identifier in for loop, got ${this.current_token().to_string()}`,
        );
        return this.new_node("error", "Invalid for-in loop");
      }
    } else {
      this.report_error(
        UnexpectedTokenError,
        `Expected 'const' or 'let' after 'for', got ${this.current_token().to_string()}`,
      );
      return this.new_node("error", "Invalid for loop");
    }
  }

  parse_break_statement() {
    this.expect("keyword", "break");
    this.expect("symbol", ";");
    return this.new_node("break_statement", {});
  }

  parse_continue_statement() {
    this.expect("keyword", "continue");
    this.expect("symbol", ";");
    return this.new_node("continue_statement", {});
  }

  parse_return_statement() {
    this.expect("keyword", "return");

    // Check if there's an expression after the return keyword
    let value = null;
    if (!this.matches_token("symbol", ";")) {
      value = this.parse_expression();
    }

    this.expect("symbol", ";");

    return this.new_node("return statement", { value });
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

    // Handle optional semicolon after block
    if (this.matches_token("symbol", ";")) {
      this.advance();
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
      this.expect("keyword", "const");
    } else {
      this.expect("keyword", "let");
    }
    const identifier = this.expect("identifier");

    // Parse optional type annotation
    let type_annotation = null;
    if (this.matches_token("symbol", ":")) {
      this.advance();
      type_annotation = this.parse_type();
    }

    this.expect("symbol", "=");

    // Check if this is a function expression
    let initializer;
    if (
      this.matches_token("symbol", "(") &&
      this.peek_ahead().type === "symbol" &&
      this.peek_ahead().value === ")"
    ) {
      initializer = this.parse_function_expression();

      // Make semicolon optional for function expressions at the top level
      if (this.matches_token("symbol", ";")) {
        this.advance();
      } else if (this.current_token().type === "eof") {
        // If we're at the end of the file, don't expect a semicolon
      } else {
        this.expect("symbol", ";");
      }
    } else {
      initializer = this.parse_expression();
      this.expect("symbol", ";");
    }

    if (identifier === null) {
      return this.new_node(
        "error",
        `Invalid ${is_const ? "const" : "variable"} declaration`,
      );
    }

    return this.new_node("variable declaration", {
      identifier: identifier.value,
      type_annotation,
      initializer,
      is_const,
    });
  }

  parse_type() {
    const base_type_token = this.expect("identifier");
    if (base_type_token === null) {
      this.report_error(UnexpectedTokenError, "Expected type name");
      return null;
    }

    // Check for generic type parameters
    if (this.matches_token("symbol", "<")) {
      return this.parse_generic_type(base_type_token.value);
    }

    return this.new_node("type", {
      name: base_type_token.value,
      parameters: null,
    });
  }

  parse_generic_type(base_type_name) {
    this.expect("symbol", "<");

    const type_parameters = [];

    // Parse comma-separated type parameters
    while (true) {
      const type_param = this.parse_type();
      if (type_param === null) {
        this.report_error(UnexpectedTokenError, "Expected type parameter");
        break;
      }

      type_parameters.push(type_param);

      if (this.matches_token("symbol", ",")) {
        this.advance();
      } else if (this.matches_token("symbol", ">")) {
        break;
      } else {
        this.report_error(
          UnexpectedTokenError,
          `Expected ',' or '>' in type parameters, got ${this.current_token().to_string()}`,
        );
        break;
      }
    }

    this.expect("symbol", ">");

    return this.new_node("type", {
      name: base_type_name,
      parameters: type_parameters,
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

        // Check for struct object literal
        if (this.matches_token("symbol", "{")) {
          return this.parse_struct_literal(identifier);
        }

        // Check for generic type instantiation
        if (this.matches_token("symbol", "<")) {
          // Parse generic type
          const type_parameters = [];
          this.advance(); // Consume '<'

          while (true) {
            // Parse type parameter
            if (this.matches_token("identifier")) {
              const param_type = this.parse_type();
              type_parameters.push(param_type);

              if (this.matches_token("symbol", ",")) {
                this.advance(); // Consume ','
              } else if (this.matches_token("symbol", ">")) {
                break;
              } else {
                this.report_error(
                  UnexpectedTokenError,
                  `Expected ',' or '>' in generic type instantiation, got ${this.current_token().to_string()}`,
                );
                break;
              }
            } else {
              this.report_error(
                UnexpectedTokenError,
                `Expected type parameter in generic type instantiation, got ${this.current_token().to_string()}`,
              );
              break;
            }
          }

          this.expect("symbol", ">"); // Consume '>'

          identifier = this.new_node("generic type instantiation", {
            base_type: identifier,
            type_parameters,
          });
        }

        // Check for function call
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
        } else if (token.value === "[") {
          return this.parse_array_literal();
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

  parse_struct_literal(struct_type) {
    this.expect("symbol", "{");

    const fields = [];

    // Parse fields
    if (!this.matches_token("symbol", "}")) {
      while (true) {
        const field_name = this.expect("identifier");
        if (field_name === null) {
          this.report_error(UnexpectedTokenError, "Expected field name");
          break;
        }

        // Check if this is a shorthand field (just the name)
        if (
          this.matches_token("symbol", ",") ||
          this.matches_token("symbol", "}")
        ) {
          // Shorthand field - name is the same as the variable
          fields.push({
            name: field_name.value,
            value: this.new_node("identifier", field_name.value),
          });

          if (this.matches_token("symbol", ",")) {
            this.advance();
            if (this.matches_token("symbol", "}")) {
              break;
            }
          } else {
            break;
          }
        } else {
          // Regular field with value
          this.expect("symbol", ":");

          const field_value = this.parse_expression(0);

          fields.push({
            name: field_name.value,
            value: field_value,
          });

          if (this.matches_token("symbol", ",")) {
            this.advance();
            if (this.matches_token("symbol", "}")) {
              break;
            }
          } else if (this.matches_token("symbol", "}")) {
            break;
          } else {
            this.report_error(
              UnexpectedTokenError,
              `Expected ',' or '}' after field value, got ${this.current_token().to_string()}`,
            );
            break;
          }
        }
      }
    }

    this.expect("symbol", "}");

    return this.new_node("struct_literal", {
      struct_type,
      fields,
    });
  }

  parse_array_literal() {
    this.expect("symbol", "[");
    const elements = [];

    if (this.matches_token("symbol", "]")) {
      this.advance();
      return this.new_node("array literal", elements);
    }

    while (true) {
      const element = this.parse_expression(0);
      elements.push(element);

      if (this.matches_token("symbol", ",")) {
        this.advance();
      } else if (this.matches_token("symbol", "]")) {
        break;
      } else {
        this.report_error(
          UnexpectedTokenError,
          `Expected ',' or ']' in array literal, got ${this.current_token().to_string()}`,
        );
        break;
      }
    }

    this.expect("symbol", "]");
    return this.new_node("array literal", elements);
  }

  parse_function_expression() {
    const params = this.parse_parameter_list();

    // Parse return type
    let return_type = null;
    if (this.matches_token("operator", "->")) {
      this.advance();
      return_type = this.parse_type();
    } else {
      this.report_error(
        UnexpectedTokenError,
        `Expected '->' after parameters, got ${this.current_token().to_string()}`,
      );
      return this.new_node("error", "Invalid function expression");
    }

    const body = this.parse_block();

    // Handle optional semicolon after block
    if (this.matches_token("symbol", ";")) {
      this.advance();
    }

    return this.new_node("function expression", { params, return_type, body });
  }

  parse_parameter_list() {
    this.expect("symbol", "(");
    const params = [];
    if (this.matches_token("symbol", ")")) {
      this.advance();
      return params;
    }

    while (true) {
      const param_name = this.expect("identifier");
      if (param_name === null) {
        this.report_error(UnexpectedTokenError, "Expected parameter name");
        break;
      }

      // Parse parameter type annotation
      let param_type = null;
      if (this.matches_token("symbol", ":")) {
        this.advance();
        param_type = this.parse_type();
      }

      params.push({
        name: param_name.value,
        type: param_type,
      });

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
