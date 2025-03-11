export class LexerError extends Error {
  constructor(message) {
    super(message);
    this.name = "LexerError";
  }

  to_string() {
    return `${this.name}: ${this.message}.`;
  }
}

export class UnterminatedStringError extends LexerError {
  constructor() {
    super("unterminated string literal");
    this.name = "UnterminatedStringError";
  }
}

export class InvalidCharacterError extends LexerError {
  constructor() {
    super("invalid character");
    this.name = "InvalidCharacterError";
  }
}

export class UnexpectedCharacter extends LexerError {
  constructor() {
    super("unexpected character");
    this.name = "UnexpectedCharacterError";
  }
}

export class ParserError extends Error {
  constructor(message) {
    super(message);
    this.name = "ParserError";
  }

  to_string() {
    return `${this.name}: ${this.message}.`;
  }
}

export class UnexpectedTokenError extends ParserError {
  constructor(message) {
    super(message);
    this.name = "UnexpectedTokenError";
  }
}
