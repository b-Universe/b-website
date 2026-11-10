const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'assets', 'js', 'projects', 'building-generator');
const outFile = path.join(repoRoot, 'assets', 'js', 'projects', 'building-generator.js');

const moduleOrder = [
  'utils.js',
  'core/layouts.js',
  'core/entrances.js',
  'config.js',
  'core/blueprints.js',
  'geometry/materials.js',
  'geometry/primitives.js',
  'geometry/facades.js',
  'geometry/details.js',
  'geometry/building.js',
  'studio/preview.js',
  'studio/export.js',
  'studio/controls.js',
  'index.js'
];

function build() {
  const parts = [];
  parts.push(`/* B Remastered - 3D Building Generator */
(function () {
  'use strict';
`);

  for (const relPath of moduleOrder) {
    const fullPath = path.join(srcDir, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required module not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');

    let inMultiLineImport = false;
    let inMultiLineExport = false;
    const lines = content.split(/\r?\n/).map(line => {
      if (inMultiLineImport) {
        if (line.includes(';')) inMultiLineImport = false;
        return '';
      }
      if (inMultiLineExport) {
        if (line.includes(';')) inMultiLineExport = false;
        return '';
      }
      if (/^import\s*\{/.test(line) && !line.includes(';')) {
        inMultiLineImport = true;
        return '';
      }
      if (/^export\s*\{/.test(line) && !line.includes(';')) {
        inMultiLineExport = true;
        return '';
      }
      if (/^import\s+/.test(line)) {
        return '';
      }
      if (/^export\s*\{/.test(line)) {
        return '';
      }
      return line.replace(/^export\s+(async\s+function|function|const|let|var|class)\s+/, '$1 ');
    });

    const stripped = lines.join('\n').trim();
    if (stripped.length > 0) {
      parts.push(`\n${stripped}\n`);
    }
  }

  parts.push(`
})();
`);

  const output = parts.join('\n');

  try {
    new Function(output);
  } catch (err) {
    console.error('Bundle failed syntax verification:', err);
    process.exit(1);
  }

  fs.writeFileSync(outFile, output, 'utf8');
  console.log(`Bundle updated: ${outFile} (${output.length} bytes)`);
}

if (require.main === module) {
  build();
}

module.exports = { build, moduleOrder };
