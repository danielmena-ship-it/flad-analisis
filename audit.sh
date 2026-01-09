#!/bin/bash
echo "=== AUDITORÍA FLAD ANALISIS ==="
echo ""
echo "1. Declaraciones duplicadas (const):"
grep -n "^[[:space:]]*const rangoActivo =\|^[[:space:]]*const rangoTexto =" src/components/{Matrix,Analysis}Tab.tsx || echo "  ✓ No encontradas"
echo ""
echo "2. useEffect mal cerrados:"
for file in src/components/{Matrix,Analysis}Tab.tsx; do
  echo "  $file:"
  grep -n "}, \[\]);" $file | awk '{print "    Línea " $1}'
done
echo ""
echo "3. Código después de return principal:"
for file in src/components/{Matrix,Analysis}Tab.tsx; do
  echo "  $file:"
  awk '/^[[:space:]]*return \(/ {found=1; line=NR} found && /^}$/ && NR > line+5 {print "    Posible código después de return en línea " line}' $file
done
echo ""
echo "4. Sintaxis TypeScript:"
npx tsc --noEmit --pretty 2>&1 | grep -E "(error TS|components/(Matrix|Analysis)Tab.tsx)" | head -20 || echo "  ✓ Sin errores"
