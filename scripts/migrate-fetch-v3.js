#!/usr/bin/env node
/**
 * Migration v3: Handle template literal fetch calls
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'packages', 'studio', 'src');

function findFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full));
    else if (full.endsWith('.tsx')) results.push(full);
  }
  return results;
}

const files = findFiles(srcDir).filter(f =>
  !f.includes('app/api/') && !f.includes('lib/api.ts') && !f.includes('lib/tauri.ts')
);

let totalFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes("fetch(`")) continue;

  const original = content;

  // Ensure import exists
  if (!content.includes("import { api } from '@/lib/api'")) {
    if (content.startsWith("'use client'")) {
      content = content.replace("'use client';", "'use client';\n\nimport { api } from '@/lib/api';");
    }
  }

  // Pattern: await fetch(`/api/xxx`, { method: 'POST', headers: {...}, body: JSON.stringify(x) })
  content = content.replace(
    /const\s+(\w+)\s*=\s*await\s*fetch\((`[^`]+`),\s*\{\s*method:\s*'POST',\s*headers:\s*\{[^}]*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)/g,
    'const $1 = await api.post($2, $3)'
  );

  // await fetch with POST
  content = content.replace(
    /await\s*fetch\((`[^`]+`),\s*\{\s*method:\s*'POST',\s*headers:\s*\{[^}]*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)/g,
    'await api.post($1, $2)'
  );

  // await fetch with PUT
  content = content.replace(
    /await\s*fetch\((`[^`]+`),\s*\{\s*method:\s*'PUT',\s*headers:\s*\{[^}]*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)/g,
    'await api.put($1, $2)'
  );

  // await fetch with DELETE + body
  content = content.replace(
    /await\s*fetch\((`[^`]+`),\s*\{\s*method:\s*'DELETE',\s*headers:\s*\{[^}]*\},\s*body:\s*JSON\.stringify\(([^)]+)\)\s*\}\)/g,
    'await api.del($1, $2)'
  );

  // await fetch with DELETE no body
  content = content.replace(
    /await\s*fetch\((`[^`]+`),\s*\{\s*method:\s*'DELETE'\s*\}\)/g,
    'await api.del($1)'
  );

  // fetch (no await) with DELETE
  content = content.replace(
    /fetch\((`[^`]+`),\s*\{\s*method:\s*'DELETE'\s*\}\)/g,
    'api.del($1)'
  );

  // fetch with GET and query params (no body)
  content = content.replace(
    /fetch\((`[^`]+`)\)\s*\n\s*\.then\(r\s*=>\s*r\.json\(\)\)/g,
    'api.get($1)'
  );

  // Simple fetch with template literal (GET, no options)
  content = content.replace(
    /const\s+(\w+)\s*=\s*await\s*fetch\((`[^`]+`)\)\s*;\s*\n\s*const\s+(\w+)\s*=\s*await\s*\2\.json\(\)/g,
    'const $1 = await api.get($2)'
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    const matches = (content.match(/api\.(get|post|put|del)\(/g) || []).length;
    totalFiles++;
    console.log(`Updated: ${path.relative(srcDir, file)} (${matches} api calls)`);
  }
}

console.log(`\nTotal: ${totalFiles} files updated`);
