import fs from 'fs';
import path from 'path';

console.log("=== Release Verification ===");

const zipPath = path.join(process.cwd(), 'release', 'alternatab-v1.0.0.zip');
const distPath = path.join(process.cwd(), 'dist');

let errors = [];

// 1. Check zip file
if (!fs.existsSync(zipPath)) {
  errors.push(`Release zip not found at: ${zipPath}`);
} else {
  const stats = fs.statSync(zipPath);
  if (stats.size === 0) {
    errors.push(`Release zip is empty (0 bytes)`);
  } else {
    console.log(`✓ Release zip found: ${zipPath} (${(stats.size / 1024).toFixed(2)} KB)`);
  }
}

// 2. Check no .map files
function checkNoMaps(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      checkNoMaps(filePath);
    } else if (file.endsWith('.map')) {
      errors.push(`Found sourcemap file: ${filePath}`);
    }
  }
}

if (fs.existsSync(distPath)) {
  checkNoMaps(distPath);
  console.log("✓ No sourcemap (.map) files found in dist/");
} else {
  errors.push(`dist/ directory not found`);
}

// 3. Check no console.log inside content and background scripts
const contentPath = path.join(distPath, 'src', 'content', 'index.js');
const backgroundPath = path.join(distPath, 'src', 'background', 'index.js');

function checkNoConsoleLog(filePath, name) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Compiled script not found: ${filePath}`);
    return;
  }
  const code = fs.readFileSync(filePath, 'utf8');
  if (code.includes('console.log') || code.includes('console.warn') || code.includes('console.error')) {
    errors.push(`${name} contains console statements!`);
  } else {
    console.log(`✓ ${name} contains 0 console statements`);
  }
}

checkNoConsoleLog(contentPath, 'Content Script');
checkNoConsoleLog(backgroundPath, 'Background Script');

if (errors.length > 0) {
  console.error("\n❌ Verification Failed!");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
} else {
  console.log("\n✨ All release verification checks passed successfully!");
  process.exit(0);
}
