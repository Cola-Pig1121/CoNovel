#!/usr/bin/env node
/**
 * Comprehensive fetch migration - handles all patterns
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
  !f.includes('app/api/') && !f.includes('lib/api.ts') && !f.includes('lib/tauri.ts')
);

let totalFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes("fetch('")) continue;

  const original = content;

  // Add import if missing
  if (!content.includes("import { api } from '@/lib/api'")) {
    if (content.startsWith("'use client'")) {
      content = content.replace("'use client';", "'use client';\n\nimport { api } from '@/lib/api';");
    } else {
      const idx = content.indexOf('import ');
      if (idx >= 0) content = content.slice(0, idx) + "import { api } from '@/lib/api';\n" + content.slice(idx);
    }
  }

  // Replace simple: fetch('/api/xxx').then(r => r.json())
  content = content.replace(
    /fetch\((['"`]\/api\/[^'"`]+['"`])\)\.then\(r\s*=>\s*r\.json\(\)\)/g,
    'api.get($1)'
  );

  // Replace: const res = await fetch('/api/xxx').then(r => r.json())
  content = content.replace(
    /await fetch\((['"`]\/api\/[^'"`]+['"`])\)\.then\(r\s*=>\s*r\.json\(\)\)/g,
    'await api.get($1)'
  );

  // Replace: const res = await fetch(url, { method: 'POST', headers: ..., body: JSON.stringify(x) })
  content = content.replace(
    /const\s+(\w+)\s*=\s*await\s*fetch\(([^,]+),\s*\{[\s]*method:\s*'POST'[\s\S]*?body:\s*JSON\.stringify\(([^)]+)\)[\s\S]*?\}\)/g,
    'const $1 = await api.post($2, $3)'
  );

  // Replace: await fetch(url, { method: 'POST', ... })
  content = content.replace(
    /await\s*fetch\(([^,]+),\s*\{[\s]*method:\s*'POST'[\s\S]*?body:\s*JSON\.stringify\(([^)]+)\)[\s\S]*?\}\)/g,
    'await api.post($1, $2)'
  );

  // Replace: await fetch(url, { method: 'PUT', ... })
  content = content.replace(
    /await\s*fetch\(([^,]+),\s*\{[\s]*method:\s*'PUT'[\s\S]*?body:\s*JSON\.stringify\(([^)]+)\)[\s\S]*?\}\)/g,
    'await api.put($1, $2)'
  );

  // Replace: await fetch(url, { method: 'DELETE', body: JSON.stringify(x) })
  content = content.replace(
    /await\s*fetch\(([^,]+),\s*\{[\s]*method:\s*'DELETE'[\s\S]*?body:\s*JSON\.stringify\(([^)]+)\)[\s\S]*?\}\)/g,
    'await api.del($1, $2)'
  );

  // Replace: await fetch(url, { method: 'DELETE' })
  content = content.replace(
    /await\s*fetch\(([^,]+),\s*\{[\s]*method:\s*'DELETE'\s*\}\)/g,
    'await api.del($1)'
  );

  // Replace: fetch(url, { method: 'DELETE' }) (no await)
  content = content.replace(
    /fetch\(([^,]+),\s*\{[\s]*method:\s*'DELETE'\s*\}\)/g,
    'api.del($1)'
  );

  // Replace remaining: await fetch(url, { method: 'PUT', body: ... })
  // with multi-line body patterns
  content = content.replace(
    /await\s*fetch\(([^,]+),\s*\{\s*\n\s*method:\s*'PUT',\s*\n\s*headers:\s*\{[^}]*\},\s*\n\s*body:\s*JSON\.stringify\(([^)]+)\),?\s*\n\s*\}\)/g,
    'await api.put($1, $2)'
  );

  // Replace remaining POST patterns with multi-line body
  content = content.replace(
    /await\s*fetch\(([^,]+),\s*\{\s*\n\s*method:\s*'POST',\s*\n\s*headers:\s*\{[^}]*\},\s*\n\s*body:\s*JSON\.stringify\(([^)]+)\),?\s*\n\s*\}\)/g,
    'await api.post($1, $2)'
  );

  // Replace: fetch('/api/xxx', { method: 'DELETE' }) in inline onclick
  content = content.replace(
    /fetch\((`[^`]+`),\s*\{\s*method:\s*'DELETE'\s*\}\)/g,
    'api.del($1)'
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    const matches = (content.match(/api\.(get|post|put|del)\(/g) || []).length;
    totalFiles++;
    console.log(`Updated: ${path.relative(srcDir, file)} (${matches} api calls)`);
  }
}

console.log(`\nTotal: ${totalFiles} files updated`);
