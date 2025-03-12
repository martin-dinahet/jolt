export class ASTNode {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }

  toJSON() {
    return {
      type: this.type,
      value: this.#serializeValue(this.value),
    };
  }

  #serializeValue(value) {
    if (value instanceof ASTNode) {
      return value.toJSON();
    } else if (Array.isArray(value)) {
      return value.map((item) => this.#serializeValue(item));
    } else if (typeof value === "object" && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, val]) => [
          key,
          this.#serializeValue(val),
        ]),
      );
    }
    return value;
  }
}
