import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const excluded = new Set([".git", "artifacts", "cache", "dist", "node_modules", "node_modules.incomplete"]);

async function collectMarkdown(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdown(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(fullPath);
  }
  return files;
}

const failures = [];
for (const file of await collectMarkdown(root)) {
  const markdown = await readFile(file, "utf8");
  const links = markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of links) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || /^(?:https?:|mailto:|#)/i.test(rawTarget)) continue;
    const relativeTarget = decodeURIComponent(rawTarget.split("#", 1)[0]);
    const resolved = path.resolve(path.dirname(file), relativeTarget);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      failures.push(`${path.relative(root, file)} links outside repository: ${rawTarget}`);
      continue;
    }
    await access(resolved).catch(() => {
      failures.push(`${path.relative(root, file)} has missing link target: ${rawTarget}`);
    });
  }
}

assert.deepEqual(failures, [], failures.join("\n"));
console.log("PASS documentation links: all local targets exist inside the repository");
