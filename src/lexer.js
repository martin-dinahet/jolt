import { Token } from "./token.js";

export class Lexer {
  constructor(source, keywords) {
    this.source = source.split("");
    this.tokens = [];
    this.cursor = null;
    this.ccount = -1;
    this.buffer = "";
    this.string = "";
    this.quotes = false;
    this.keywords = keywords;
    this.source_lines = source.split("\n");
    this.line = 1;
    this.column = 0;
    this.start_line = 1;
    this.start_column = 0;
    this.errors = [];
    this.advance();
  }

  advance() {
    this.ccount++;
    if (this.source.length > this.ccount) {
      this.cursor = this.source[this.ccount];
      if (this.cursor === "\n") {
        this.line++;
        this.column = 0;
      } else {
        this.column++;
      }
      return;
    }
    this.cursor = null;
  }

  peek_next() {
    return this.source[this.ccount + 1] || null;
  }

  add_token(type, value) {
    this.tokens.push(
      new Token(type, value, this.start_line, this.start_column),
    );
  }

  mark_position() {
    this.start_line = this.line;
    this.start_column = this.column;
  }

  is_numeric(string) {
    return /^[0-9]*\.?[0-9]+$/.test(string);
  }

  is_whitespace(string) {
    return /^\s*$/.test(string);
  }

  is_symbol(string) {
    return /^[^\w\s]$/.test(string);
  }

  is_keyword(string) {
    return this.keywords.includes(string);
  }

  is_operator_sequence() {
    const sequence = this.cursor + this.peek_next();
    const operators = ["==", "!=", ">=", "<=", "->", "&&", "||", "::"];
    return operators.includes(sequence);
  }

  get_source_snippet(line, column, length = 1) {
    if (line <= 0 || line > this.source_lines.length) {
      return null;
    }
    const source_line = this.source_lines[line - 1];
    const snippet = source_line;
    const pointer =
      " ".repeat(column - 1) + "^" + "~".repeat(Math.max(0, length - 1));

    return { snippet, pointer };
  }

  report_error(error_class, ...args) {
    const { snippet, pointer } = this.get_source_snippet(
      this.line,
      this.column,
    );
    const error = new error_class(
      ...args,
      this.line,
      this.column,
      snippet,
      pointer,
    );
    console.error(error.toString());
    return error;
  }

  get_errors() {
    return this.errors;
  }

  has_error() {
    return this.errors.length > 0;
  }

  flush_buffer() {
    if (this.buffer.trim().length > 0) {
      if (this.is_keyword(this.buffer)) {
        this.add_token("keyword", this.buffer);
      } else if (this.is_numeric(this.buffer)) {
        this.add_token("number", this.buffer);
      } else {
        this.add_token("identifier", this.buffer);
      }
    }
    this.buffer = "";
  }

  flush_string() {
    if (this.string.length >= 1) {
      this.add_token("string", this.string);
    }
    this.string = "";
  }

  generate_tokens() {
    try {
      while (this.cursor !== null) {
        this.mark_position();
        // handle string literals
        if (this.cursor === '"') {
          if (this.quotes) {
            this.flush_string();
            this.quotes = false;
            this.advance();
            continue;
          } else {
            this.flush_buffer();
            this.quotes = true;
            this.advance();
            continue;
          }
        }
        // handle token storing while in quotes
        if (this.quotes) {
          if (
            this.peek_next() === null &&
            this.ccount === this.source.length - 1
          ) {
            throw this.report_error(UnterminatedStringError);
          }
          this.string += this.cursor;
          this.advance();
          continue;
        }

        // handle comments
        if (this.cursor === "/" && this.peek_next() === "/") {
          while (this.cursor !== null && this.cursor !== "\n") {
            this.advance();
          }
          if (this.cursor !== null) {
            this.advance();
          }
          continue;
        }
        if (this.cursor === "/" && this.peek_next() === "*") {
          this.advance();
          this.advance();
          while (
            this.cursor !== null &&
            !(this.cursor === "*" && this.peek_next() === "/")
          ) {
            this.advance();
          }
          if (this.cursor === null) {
            throw this.report_error(LexerError, "Unterminated block comment");
          }

          this.advance();
          this.advance();
          continue;
        }
        // handle operator sequences
        if (this.is_operator_sequence()) {
          const operator = this.cursor + this.peek_next();
          this.flush_buffer();
          this.add_token("operator", operator);
          this.advance();
          continue;
        }
        // handle whitespace
        if (this.is_whitespace(this.cursor)) {
          this.flush_buffer();
          this.advance();
          continue;
        }
        // handle symbols
        if (this.is_symbol(this.cursor)) {
          this.flush_buffer();
          this.add_token("symbol", this.cursor);
          this.advance();
          continue;
        }
        // Handle identifiers and keywords
        if (/[a-zA-Z0-9_]/.test(this.cursor)) {
          this.buffer += this.cursor;
          this.advance();
          continue;
        }
        // handle invalid character
        throw this.report_error(InvalidCharacterError, this.cursor);
      }
      // check for unterminated string at end of file
      if (this.quotes) {
        throw this.report_error(UnterminatedStringError);
      }
      this.flush_buffer();
      this.add_token("eof", "eof");
      return this.tokens;
    } catch (error) {
      if (!(error instanceof LexerError)) {
        console.error("Unexpected error during lexing: ", error);
      }
      this.add_token("eof", "eof");
      return this.tokens;
    }
  }
}
