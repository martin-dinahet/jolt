export class Token {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }

  to_string() {
    return `Token(${this.type}, ${this.value})`;
  }
}
