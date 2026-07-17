import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { build } from "esbuild";
import { isAddress, zeroAddress } from "viem";

const projectRoot = process.cwd();
const frontendRoot = path.join(projectRoot, "frontend");
const outputDirectory = path.join(frontendRoot, "dist");
const contractAddress = process.env.CIPHERGATE_CONTRACT_ADDRESS ?? "";
const allowUnconfigured = process.argv.includes("--allow-unconfigured");

if (
  contractAddress &&
  (!isAddress(contractAddress) || contractAddress.toLowerCase() === zeroAddress)
) {
  throw new Error("CIPHERGATE_CONTRACT_ADDRESS must be a valid non-zero Ethereum address.");
}
if (!contractAddress && !allowUnconfigured) {
  throw new Error(
    "Production frontend build requires CIPHERGATE_CONTRACT_ADDRESS. Use build:frontend:preview only for an unconfigured preview.",
  );
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  cp(path.join(frontendRoot, "index.html"), path.join(outputDirectory, "index.html")),
  cp(path.join(frontendRoot, "style.css"), path.join(outputDirectory, "style.css")),
  cp(path.join(projectRoot, "LICENSE"), path.join(outputDirectory, "LICENSE.txt")),
]);

const buildResult = await build({
  entryPoints: [path.join(frontendRoot, "src/app.js")],
  outfile: path.join(outputDirectory, "app.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome120", "firefox120", "safari17"],
  minify: true,
  sourcemap: true,
  define: {
    "process.env.CIPHERGATE_CONTRACT_ADDRESS": JSON.stringify(contractAddress),
  },
  legalComments: "external",
  metafile: true,
});

async function findPackage(inputPath) {
  let directory = path.dirname(path.resolve(projectRoot, inputPath));
  while (directory.startsWith(projectRoot) && directory !== projectRoot) {
    try {
      const manifest = JSON.parse(
        await readFile(path.join(directory, "package.json"), "utf8"),
      );
      if (manifest.name && manifest.version) return { directory, manifest };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    directory = path.dirname(directory);
  }
  throw new Error(`Unable to locate package metadata for bundled input ${inputPath}`);
}

const bundledPackages = new Map();
for (const inputPath of Object.keys(buildResult.metafile.inputs)) {
  if (!inputPath.split(path.sep).includes("node_modules")) continue;
  const entry = await findPackage(inputPath);
  bundledPackages.set(`${entry.manifest.name}@${entry.manifest.version}`, entry);
}

const licenseSections = [];
for (const [identifier, { directory, manifest }] of [...bundledPackages].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  const licenseFiles = (await readdir(directory))
    .filter((name) => /^(licen[cs]e|copying)(\..*)?$/i.test(name))
    .sort((a, b) => a.length - b.length || a.localeCompare(b));
  if (!licenseFiles[0]) {
    throw new Error(`Bundled package ${identifier} has no distributable license file`);
  }
  const licenseText = (await readFile(path.join(directory, licenseFiles[0]), "utf8")).trim();
  const declaredLicense =
    typeof manifest.license === "string"
      ? manifest.license
      : JSON.stringify(manifest.license ?? "unspecified");
  licenseSections.push(
    `${"=".repeat(78)}\n${identifier}\nDeclared license: ${declaredLicense}\nSource file: ${licenseFiles[0]}\n${"-".repeat(78)}\n${licenseText}`,
  );
}

await writeFile(
  path.join(outputDirectory, "THIRD_PARTY_LICENSES.txt"),
  `CipherGate browser bundle — third-party license texts\n\n${licenseSections.join("\n\n")}\n`,
  "utf8",
);

console.log(
  contractAddress
    ? `Frontend built for CipherGate ${contractAddress}`
    : "Frontend preview built in explicit unconfigured mode.",
);
