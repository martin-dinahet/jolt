export class LexerError extends Error {
  constructor(message) {
    super(message);
    this.name = "Lexer Error";
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

export class UnexpectedTokenError extends LexerError {
  constructor() {
    super("unexpected token");
    this.name = "UnexpectedTokenError";
  }
}
