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
    this.advance();
  }

  advance() {
    this.ccount++;
    if (this.source.length > this.ccount) {
      this.cursor = this.source[this.ccount];
      return;
    }
    this.cursor = null;
  }

  peek_next() {
    return this.source[this.ccount + 1] || null;
  }

  add_token(type, value) {
    this.tokens.push(new Token(type, value));
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
    const operators = ["==", "->", "&&"];
    return operators.includes(sequence);
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
    while (this.cursor !== null) {
      if (this.cursor === '"' && this.quotes) {
        this.flush_string();
        this.quotes = false;
        this.advance();
        continue;
      }
      if (this.cursor === '"' && !this.quotes) {
        this.flush_buffer();
        this.quotes = true;
        this.advance();
        continue;
      }
      if (this.cursor !== '"' && this.quotes) {
        this.string += this.cursor;
        this.advance();
        continue;
      }
      if (this.cursor !== '"' && !this.quotes) {
        if (this.is_operator_sequence()) {
          const operator = this.cursor + this.peek_next();
          this.flush_buffer();
          this.add_token("operator", operator);
          this.advance();
          continue;
        }
        if (this.is_whitespace(this.cursor)) {
          this.flush_buffer();
          this.advance();
          continue;
        }
        if (this.is_symbol(this.cursor)) {
          this.flush_buffer();
          this.add_token("symbol", this.cursor);
          this.advance();
          continue;
        }

        this.buffer += this.cursor;
        this.advance();
        continue;
      }
    }
    this.flush_buffer();
    return this.tokens;
  }
}
