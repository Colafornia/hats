interface BuiltinCommand {
  completesHat?: boolean;
  flags?: readonly string[];
}

export const BUILTIN_COMMANDS: Record<string, BuiltinCommand> = {
  run: { completesHat: true },
  exec: { completesHat: true },
  which: { completesHat: true },
  ls: {},
  add: { flags: ["--isolated"] },
  setenv: { completesHat: true, flags: ["--file", "--launch", "--isolated"] },
  init: {},
  rm: { completesHat: true },
  edit: {},
  completion: {},
};

export const BUILTIN_NAMES = Object.keys(BUILTIN_COMMANDS);
export const COMPLETE_COMMAND = "__complete";
export const RESERVED_NAMES = new Set([...BUILTIN_NAMES, COMPLETE_COMMAND]);
