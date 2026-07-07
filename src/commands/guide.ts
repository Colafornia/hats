import * as p from "@clack/prompts";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { saveConfig, defaultConfig, hatsHome, configPath } from "../core/config.js";
import { EXAMPLE } from "./init.js";
import { createFromTemplate } from "./create.js";
import { addProfileInteractive } from "./add.js";

function seedExample(): void {
  mkdirSync(hatsHome(), { recursive: true });
  if (!existsSync(configPath())) saveConfig(defaultConfig());
  const examplePath = join(hatsHome(), "config.example.toml");
  writeFileSync(examplePath, EXAMPLE);
  p.log.success(`example written: ${examplePath}`);
  p.outro(`Open & edit: \`hats edit\``);
}

/**
 * First-run guide shown when the user has no profiles. Walks them to a working
 * profile via templates, an example seed, or the step-by-step wizard.
 */
export async function guideFirstRun(): Promise<void> {
  p.intro("🎩 hats — you have no profiles yet. Let's create your first one.");

  const choice = await p.select({
    message: "How do you want to start?",
    options: [
      { value: "template", label: "From a template (company/kimi/ollama/personal) — fastest" },
      { value: "example", label: "Seed an example config to copy & edit" },
      { value: "wizard", label: "Guided wizard (step by step)" },
      { value: "cancel", label: "Cancel" },
    ],
  });

  if (p.isCancel(choice)) {
    p.cancel("cancelled");
    return;
  }

  switch (choice) {
    case "template": {
      const name = await createFromTemplate();
      if (name) p.outro(`Try it: \`hats run ${name}\``);
      break;
    }
    case "example":
      seedExample();
      break;
    case "wizard": {
      const name = await addProfileInteractive();
      if (name) p.outro(`Try it: \`hats run ${name}\``);
      break;
    }
    case "cancel":
      p.outro("Bye — run `hats` again anytime.");
      break;
  }
}