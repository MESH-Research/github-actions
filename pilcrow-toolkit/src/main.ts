import { getInput } from "@actions/core";
import { run } from "/src/action";

console.log(process.env);
const inputs = {
  "docker-metadata": getInput("docker-metadata"),
  "bake-files": getInput("bake-files"),
  target: getInput("target"),
  command: getInput("command", { required: true }),
};

run("main", inputs);
