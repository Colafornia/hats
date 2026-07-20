import { runCommand, execCommand } from "./run.js";
import { whichCommand } from "./which.js";
import { lsCommand } from "./ls.js";
import { addCommand } from "./add.js";
import { rmCommand } from "./rm.js";
import { editCommand } from "./edit.js";
import { initCommand } from "./init.js";
import { setenvCommand } from "./setenv.js";
import { completionCommand } from "./completion.js";

export const COMMANDS = [
  runCommand,
  execCommand,
  whichCommand,
  lsCommand,
  addCommand,
  setenvCommand,
  initCommand,
  rmCommand,
  editCommand,
  completionCommand,
];
