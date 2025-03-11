export class ASTNode {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }

  to_string(indent = 0) {
    const spacing = " ".repeat(indent);
    const nestedIndent = indent + 2;
    const nestedSpacing = " ".repeat(nestedIndent);
    const t = this.type;
    let v;

    if (this.value instanceof ASTNode) {
      v = "\n" + nestedSpacing + this.value.to_string(nestedIndent);
    } else if (Array.isArray(this.value)) {
      if (this.value.length === 0) {
        v = "[]";
      } else {
        v =
          "[\n" +
          this.value
            .map(
              (item) =>
                nestedSpacing +
                (item instanceof ASTNode
                  ? item.to_string(nestedIndent)
                  : String(item)),
            )
            .join(",\n") +
          "\n" +
          spacing +
          "]";
      }
    } else if (typeof this.value === "object" && this.value !== null) {
      const entries = Object.entries(this.value);
      if (entries.length === 0) {
        v = "{}";
      } else {
        v =
          "{\n" +
          entries
            .map(([key, val]) => {
              const valueStr =
                val instanceof ASTNode
                  ? val.to_string(nestedIndent)
                  : typeof val === "object"
                    ? JSON.stringify(val, null, 2).replace(/^/gm, nestedSpacing)
                    : String(val);
              return `${nestedSpacing}${key}: ${valueStr}`;
            })
            .join(",\n") +
          "\n" +
          spacing +
          "}";
      }
    } else {
      v = String(this.value);
    }

    return `ASTNode(${t}, ${v})`;
  }
}
