#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const files = [
  'src/components/MatrixTab.tsx',
  'src/components/AnalysisTab.tsx'
];

console.log('🔍 DETECTOR DE DUPLICADOS\n');

let hasIssues = false;

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  
  // Detectar funciones/constantes duplicadas a nivel componente
  const topLevelDecls = new Map();
  let inFunction = 0;
  
  lines.forEach((line, idx) => {
    // Tracking de scope (simple)
    if (line.includes('function') || line.includes('=>')) {
      inFunction++;
    }
    if (line.match(/^\s*}\s*$/)) {
      inFunction = Math.max(0, inFunction - 1);
    }
    
    // Solo detectar declaraciones top-level (inFunction <= 1 = dentro de componente)
    if (inFunction <= 1) {
      const match = line.match(/^\s*const\s+(\w+)\s*=/);
      if (match) {
        const name = match[1];
        if (topLevelDecls.has(name)) {
          console.log(`❌ ${filePath}:${idx + 1}`);
          console.log(`   Duplicado: const ${name}`);
          console.log(`   Primera declaración: línea ${topLevelDecls.get(name) + 1}\n`);
          hasIssues = true;
        } else {
          topLevelDecls.set(name, idx);
        }
      }
    }
  });
});

if (!hasIssues) {
  console.log('✅ Sin duplicados detectados\n');
}

// Verificar TypeScript
console.log('📝 VERIFICANDO TYPESCRIPT...');
const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ Sin errores TypeScript\n');
} catch (e) {
  const errors = e.stdout.match(/src\/components\/(Matrix|Analysis)Tab\.tsx.*error TS\d+/g);
  if (errors) {
    console.log('❌ Errores TypeScript:\n');
    errors.forEach(err => console.log(`   ${err}`));
    console.log('');
    hasIssues = true;
  }
}

process.exit(hasIssues ? 1 : 0);
