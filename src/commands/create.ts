import * as p from "@clack/prompts";
import { loadConfig, saveConfig, type Profile } from "../core/config.js";
import { TEMPLATES, TEMPLATE_ORDER, type TemplateKey } from "../core/templates.js";

/**
 * Create a profile from a template. If `presetKey` is omitted, ask which one.
 * Empty-string placeholder env values are filled via prompts; everything else
 * (launch / inherit_env / CLAUDE_CONFIG_DIR) is taken from the template.
 * Returns the created profile name, or null if cancelled.
 */
export async function createFromTemplate(presetKey?: TemplateKey): Promise<string | null> {
  let tkey = presetKey;
  if (!tkey) {
    if (TEMPLATE_ORDER.length === 1) {
      tkey = TEMPLATE_ORDER[0];
    } else {
      const picked = await p.select({
        message: "Which hat?",
        options: TEMPLATE_ORDER.map((k) => ({ value: k, label: TEMPLATES[k].label })),
      });
      if (p.isCancel(picked)) {
        p.cancel("cancelled");
        return null;
      }
      tkey = picked as TemplateKey;
    }
  }

  const t = TEMPLATES[tkey];
  const profile: Profile = {
    name: tkey,
    ...structuredClone(t.profile),
  };

  for (const pr of t.prompts) {
    const val = await p.text({
      message: pr.message,
      placeholder: pr.hint,
      validate: (v) => (v && v.trim() ? undefined : "required"),
    });
    if (p.isCancel(val)) {
      p.cancel("cancelled");
      return null;
    }
    if (profile.env) profile.env[pr.key] = val as string;
  }

  const cfg = loadConfig();
  if (cfg.profiles[profile.name]) {
    const overwrite = await p.confirm({
      message: `Profile "${profile.name}" already exists. Overwrite?`,
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("cancelled");
      return null;
    }
  }
  cfg.profiles[profile.name] = profile;
  saveConfig(cfg);
  p.log.success(`created profile "${profile.name}"`);
  return profile.name;
}