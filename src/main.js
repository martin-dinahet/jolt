import fs from "fs";
import process from "process";

function main() {
  const source = fs.readFileSync(process.argv[2], "utf-8");
  console.log(source);
}

main();
