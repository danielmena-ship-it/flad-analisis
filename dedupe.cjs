#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const files = [
  'src/components/MatrixTab.tsx',
  'src/components/AnalysisTab.tsx'
];

console.log('=== DEDUPLICACIÓN AUTOMÁTICA ===\n');

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  
  const declarations = new Map();
  const toRemove = new Set();
  
  // Detectar declaraciones duplicadas
  lines.forEach((line, idx) => {
    const match = line.match(/^\s*(const|function)\s+(\w+)/);
    if (match) {
      const [, type, name] = match;
      const key = `${type}_${name}`;
      
      if (declarations.has(key)) {
        console.log(`${filePath}: Duplicado encontrado: ${name} (línea ${idx + 1})`);
        toRemove.add(idx);
        
        // Marcar bloque completo para eliminar
        let depth = 0;
        let inBlock = false;
        for (let i = idx; i < lines.length; i++) {
          const l = lines[i];
          if (l.includes('{')) { inBlock = true; depth++; }
          if (l.includes('}')) depth--;
          toRemove.add(i);
          if (inBlock && depth === 0) break;
          if (!inBlock && l.includes(';')) break;
        }
      } else {
        declarations.set(key, idx);
      }
    }
  });
  
  if (toRemove.size > 0) {
    // Eliminar líneas duplicadas
    const cleaned = lines.filter((_, idx) => !toRemove.has(idx)).join('\n');
    fs.writeFileSync(fullPath, cleaned, 'utf8');
    console.log(`✓ Eliminadas ${toRemove.size} líneas duplicadas\n`);
  } else {
    console.log(`✓ Sin duplicados\n`);
  }
});

console.log('=== VERIFICACIÓN TYPESCRIPT ===');
const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('\n✓ Sin errores TypeScript');
} catch (e) {
  console.log('\n✗ Revisar errores arriba');
  process.exit(1);
}
