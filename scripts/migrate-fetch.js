#!/usr/bin/env node
/**
 * Migration script: Replace fetch('/api/...') with api.get/post/put/del
 * Run: node scripts/migrate-fetch.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'packages', 'studio', 'src');

function findFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full));
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) results.push(full);
  }
  return results;
}

const files = findFiles(srcDir).filter(f =>
  !f.includes('app/api/') &&
  !f.includes('lib/api.ts') &&
  !f.includes('lib/tauri.ts')
);

let totalFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const originalContent = content;

  if (!content.includes('fetch(')) continue;

  // Add import
  if (!content.includes("import { api } from '@/lib/api'")) {
    if (content.startsWith("'use client'")) {
      content = content.replace("'use client';", "'use client';\n\nimport { api } from '@/lib/api';");
    } else {
      const firstImport = content.indexOf('import ');
      if (firstImport >= 0) {
        content = content.slice(0, firstImport) + "import { api } from '@/lib/api';\n" + content.slice(firstImport);
      }
    }
  }

  // Pattern: fetch(url).then(r => r.json()) -> api.get(url)
  content = content.replace(/fetch\(([^)]+)\)\.then\(r => r\.json\(\)\)/g, 'api.get($1)');

  // Pattern: fetch(url, { method: 'POST', headers: {...}, body: JSON.stringify(x) }).then(r => r.json())
  // -> api.post(url, x)
  content = content.replace(
    /fetch\(([^,]+),\s*\{\s*method:\s*'POST',\s*headers:\s*\{[^}]*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)\.then\(r => r\.json\(\)\)/g,
    'api.post($1, $2)'
  );

  // Pattern: fetch(url, { method: 'PUT', headers: {...}, body: JSON.stringify(x) }).then(r => r.json())
  content = content.replace(
    /fetch\(([^,]+),\s*\{\s*method:\s*'PUT',\s*headers:\s*\{[^}]*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)\.then\(r => r\.json\(\)\)/g,
    'api.put($1, $2)'
  );

  // Pattern: fetch(url, { method: 'DELETE', headers: {...}, body: JSON.stringify(x) }).then(r => r.json())
  content = content.replace(
    /fetch\(([^,]+),\s*\{\s*method:\s*'DELETE',\s*headers:\s*\{[^}]*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)\.then\(r => r\.json\(\)\)/g,
    'api.del($1, $2)'
  );

  // Pattern: fetch(url, { method: 'DELETE' }).then(r => r.json())
  content = content.replace(
    /fetch\(([^,]+),\s*\{\s*method:\s*'DELETE'\s*\}\)\.then\(r => r\.json\(\)\)/g,
    'api.del($1)'
  );

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    const diff = (content.match(/api\.(get|post|put|del)\(/g) || []).length;
    totalFiles++;
    totalReplacements += diff;
    console.log(`Updated: ${path.relative(srcDir, file)} (${diff} api calls)`);
  }
}

console.log(`\nTotal: ${totalFiles} files updated, ${totalReplacements} API calls migrated`);
