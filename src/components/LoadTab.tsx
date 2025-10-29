import { Download, FileSpreadsheet, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DatabaseJSON, ContractType, LineType, LoadedDatabase } from '../types';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { esFormatoNuevo, obtenerFechaExportacion, enriquecerRequerimientos } from '../utils/database';
import { getRequerimientoStatus, formatearFecha } from '../utils';
import { CONTRACTS, LINES, STORAGE_KEY } from '../constants';
import * as XLSX from 'xlsx';

export function LoadTab() {
  const [loadedDatabases, setLoadedDatabases] = useState<LoadedDatabase[]>([]);
  const [selectedContract, setSelectedContract] = useState<ContractType | null>(null);
  const [selectedLine, setSelectedLine] = useState<LineType | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Cargar desde localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const restored: LoadedDatabase[] = JSON.parse(saved);
        setLoadedDatabases(restored);
      } catch (error) {
        console.error('Error restaurando:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const isLoaded = (contract: ContractType, line: LineType): boolean => {
    return loadedDatabases.some(db => db.contract === contract && db.line === line);
  };

  const getFechaImportacion = (contract: ContractType, line: LineType): string => {
    const db = loadedDatabases.find(db => db.contract === contract && db.line === line);
    return db?.fechaImportacion || '';
  };

  const handleButtonClick = (contract: ContractType, line: LineType) => {
    setSelectedContract(contract);
    setSelectedLine(line);
    const input = document.getElementById('file-input') as HTMLInputElement;
    input?.click();
  };

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContract || !selectedLine) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as DatabaseJSON;
      
      // Validar formato
      if (!esFormatoNuevo(data)) {
        alert('⚠️ Formato inválido. Exporta desde FLAD actualizado.');
        return;
      }
      
      const fechaExportacion = obtenerFechaExportacion(data);
      const fechaFormateada = formatearFecha(fechaExportacion);
      
      const newDB: LoadedDatabase = {
        contract: selectedContract,
        line: selectedLine,
        data: data,
        fechaImportacion: fechaFormateada
      };

      const updatedDBs = loadedDatabases.filter(
        db => !(db.contract === selectedContract && db.line === selectedLine)
      );
      updatedDBs.push(newDB);

      setLoadedDatabases(updatedDBs);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDBs));
      setForceUpdate(prev => prev + 1);

      alert(`✓ Base cargada: ${selectedContract} - ${selectedLine}\nFecha: ${fechaFormateada}`);
    } catch (error) {
      alert('Error al cargar el archivo JSON');
      console.error(error);
    } finally {
      setSelectedContract(null);
      setSelectedLine(null);
      e.target.value = '';
    }
  };

  const handleDeleteDatabase = (contract: ContractType, line: LineType) => {
    if (!confirm(`¿Eliminar base de datos ${contract} - ${line}?`)) return;
    
    const updatedDBs = loadedDatabases.filter(
      db => !(db.contract === contract && db.line === line)
    );
    
    setLoadedDatabases(updatedDBs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDBs));
    setForceUpdate(prev => prev + 1);
  };

  const exportarConsolidado = async () => {
    if (loadedDatabases.length === 0) {
      alert('No hay bases de datos cargadas');
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      // HOJA 1: Consolidado General (todos los requerimientos enriquecidos)
      const todosRequerimientos = loadedDatabases.flatMap(db => {
        const enriquecidos = enriquecerRequerimientos(db.data.requerimientos, db.data);
        return enriquecidos.map(req => ({
          Contrato: db.contract,
          Línea: db.line,
          'Jardín Código': req.jardin_codigo,
          'Jardín Nombre': req.jardin_nombre,
          Recinto: req.recinto,
          'Partida Item': req.partida_item,
          'Partida Nombre': req.partida_nombre,
          Unidad: req.partida_unidad || '',
          Cantidad: req.cantidad,
          'Precio Unitario': req.precio_unitario,
          'Precio Total': req.precio_total,
          'Fecha Inicio': req.fecha_inicio,
          'Fecha Registro': req.fecha_registro,
          'Plazo Días': req.plazo_dias,
          'Plazo Adicional': req.plazo_adicional,
          'Plazo Total': req.plazo_total,
          'Fecha Límite': req.fecha_limite,
          'Fecha Recepción': req.fecha_recepcion || '',
          'Días Atraso': req.dias_atraso,
          Multa: req.multa,
          'A Pago': req.a_pago,
          Estado: getRequerimientoStatus(req),
          'OT Código': req.ot_codigo || '',
          'Informe Código': req.informe_codigo || '',
          Descripción: req.descripcion || '',
          Observaciones: req.observaciones || ''
        }));
      });

      const wsConsolidado = XLSX.utils.json_to_sheet(todosRequerimientos);
      XLSX.utils.book_append_sheet(workbook, wsConsolidado, 'Consolidado');

      // HOJA 2: Por Contrato
      loadedDatabases.forEach(db => {
        const enriquecidos = enriquecerRequerimientos(db.data.requerimientos, db.data);
        const data = enriquecidos.map(req => ({
          Línea: db.line,
          'Jardín': req.jardin_nombre,
          Recinto: req.recinto,
          Partida: req.partida_nombre,
          Cantidad: req.cantidad,
          'Precio Total': req.precio_total,
          'Fecha Límite': req.fecha_limite,
          Estado: getRequerimientoStatus(req),
          Multa: req.multa,
          'A Pago': req.a_pago
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const sheetName = db.contract.substring(0, 31); // Max 31 chars
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      });

      // HOJA 3: Resumen por Jardín
      const resumenJardines = new Map<string, { cantidad: number; monto: number }>();
      loadedDatabases.forEach(db => {
        const enriquecidos = enriquecerRequerimientos(db.data.requerimientos, db.data);
        enriquecidos.forEach(req => {
          const key = `${req.jardin_nombre} (${req.jardin_codigo})`;
          const current = resumenJardines.get(key) || { cantidad: 0, monto: 0 };
          resumenJardines.set(key, {
            cantidad: current.cantidad + 1,
            monto: current.monto + req.a_pago
          });
        });
      });

      const dataResumen = Array.from(resumenJardines.entries()).map(([jardin, stats]) => ({
        Jardín: jardin,
        'Total Requerimientos': stats.cantidad,
        'Monto Total': stats.monto
      }));

      const wsResumen = XLSX.utils.json_to_sheet(dataResumen);
      XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen Jardines');

      // Generar buffer
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

      // Guardar archivo
      const filePath = await save({
        defaultPath: `consolidado_${new Date().toISOString().split('T')[0]}.xlsx`,
        filters: [{
          name: 'Excel',
          extensions: ['xlsx']
        }]
      });

      if (filePath) {
        await writeFile(filePath, excelBuffer);
        alert('✓ Archivo Excel exportado correctamente');
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar el archivo');
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-[#e0e6ed] mb-1 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Cargar Bases de Datos
            </h2>
            <p className="text-sm text-[#8b9eb3]">
              Seleccione cada contrato y línea para importar las bases de datos
            </p>
          </div>
          <button
            onClick={exportarConsolidado}
            disabled={loadedDatabases.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#5a8fc4] text-white rounded-lg font-medium transition hover:bg-[#4a7fb4] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Consolidado
          </button>
        </div>
      </div>

      <div className="bg-[#1a2332] border border-[#2d3e50] rounded-lg p-3 max-w-2xl mx-auto">
        <table className="table-fixed w-full">
          <colgroup>
            <col className="w-16" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#2d3e50]">
              <th className="text-left py-1.5 px-1 text-[#8b9eb3] font-medium text-xs">Línea</th>
              {CONTRACTS.map(contract => (
                <th key={contract.id} className="text-center py-1.5 px-1 text-[#8b9eb3] font-medium text-xs">
                  {contract.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody key={forceUpdate}>
            {LINES.map(line => (
              <tr key={line.id} className="border-b border-[#2d3e50]/50">
                <td className="py-1.5 px-1 text-[#e0e6ed] font-medium text-xs">{line.label}</td>
                {CONTRACTS.map(contract => {
                  // Ascensores solo tiene línea 1
                  if (contract.id === 'ascensores' && line.id !== 'linea_1') {
                    return (
                      <td key={`${line.id}-${contract.id}`} className="py-1.5 px-1 text-center">
                        <div className="px-2 py-1.5 text-xs text-[#4a5568]">—</div>
                      </td>
                    );
                  }

                  const loaded = isLoaded(contract.id, line.id);
                  const fecha = getFechaImportacion(contract.id, line.id);
                  
                  return (
                    <td key={`${line.id}-${contract.id}`} className="py-1.5 px-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleButtonClick(contract.id, line.id)}
                          className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                            loaded
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                          title={`${contract.label} - ${line.label}${loaded ? ` (${fecha})` : ''}`}
                        >
                          {loaded ? fecha : <Download className="w-3 h-3" />}
                        </button>
                        {loaded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDatabase(contract.id, line.id);
                            }}
                            className="p-1.5 rounded text-xs font-medium transition-all bg-red-600 hover:bg-red-700 text-white"
                            title="Eliminar base de datos"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <input
        id="file-input"
        type="file"
        accept=".json"
        onChange={handleFileLoad}
        className="hidden"
      />
    </div>
  );
}
