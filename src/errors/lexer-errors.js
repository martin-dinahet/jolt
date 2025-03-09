export class LexerError extends Error {
  constructor(message, line, column, snippet, pointer) {
    super(message);
    this.name = "LexerError";
    this.line = line;
    this.column = column;
    this.snippet = snippet;
    this.pointer = pointer;
  }

  toString() {
    let errorMessage = `${this.name}: ${this.message} at line ${this.line}, column ${this.column}\n\n`;

    if (this.snippet) {
      errorMessage += `${this.snippet}\n`;
      if (this.pointer) {
        errorMessage += `${this.pointer}\n`;
      }
    }

    return errorMessage;
  }
}

export class UnterminatedStringError extends LexerError {
  constructor(line, column, snippet, pointer) {
    super("Unterminated string literal", line, column, snippet, pointer);
    this.name = "UnterminatedStringError";
  }
}

export class InvalidCharacterError extends LexerError {
  constructor(char, line, column, snippet, pointer) {
    super(`Invalid character '${char}'`, line, column, snippet, pointer);
    this.name = "InvalidCharacterError";
  }
}

export class UnexpectedTokenError extends LexerError {
  constructor(token, expected, line, column, snippet, pointer) {
    super(
      `Unexpected token '${token}', expected ${expected}`,
      line,
      column,
      snippet,
      pointer,
    );
    this.name = "UnexpectedTokenError";
  }
}
