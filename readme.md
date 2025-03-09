# Jolt

## Introduction
Jolt is a simple, Rust-inspired programming language implemented in JavaScript. It aims to provide a lightweight and intuitive syntax while focusing on safety and ease-of-use.

## Features
- Lexer (implemented): tokenizes Jolt code for further processing.
- Parser (planned): converts tokens into an AST
- Interpreter (planned): executes Jolt code dynamically

## Example code
### Hello, World
```
const main = () -> Void {
  std::print("Hello, World!");
};
```
### Structs
```
struct User {
  id: Number;
  username: String;
  password: String;
};

impl User {
  new: (username: String, password: String) -> User {
     return User { id: 0, username, password };
  }
}

const main = () -> Void {
  const user1 = User::new("john.doe", "password123");
  std::print("user 1: ${user1::username} -> ${user1::password}");
}
```

## Installation
```sh
git clone https://github.com/martin-dinahet/jolt.git
cd jolt
pnpm install
```

## Usage
```sh
pnpm run start <input-file.jolt>

## Roadmap
- [x] Lexer
- [ ] Parser
- [ ] Interpreter

```

## Contributing
Contributions are welcome! Feel free to open issues and pull requests.
