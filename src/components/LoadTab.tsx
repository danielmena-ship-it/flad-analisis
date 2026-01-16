import { Download, FileSpreadsheet, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { DatabaseJSON, ContractType, LineType, LoadedDatabase } from '../types';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { esFormatoNuevo, obtenerFechaExportacion, enriquecerRequerimientos } from '../utils/database';
import { formatearFecha } from '../utils';
import { CONTRACTS, LINES, STORAGE_KEY } from '../constants';
import * as XLSX from 'xlsx';

export function LoadTab() {
  const [loadedDatabases, setLoadedDatabases] = useState<LoadedDatabase[]>([]);
  const [selectedContract, setSelectedContract] = useState<ContractType | null>(null);
  const [selectedLine, setSelectedLine] = useState<LineType | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Feedback toast
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  
  // Modal confirmación borrar
  const [deleteModal, setDeleteModal] = useState<{ contract: ContractType; line: LineType } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showFeedback = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    // Limpiar timeout anterior
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    
    setFeedback({ message, type });
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 3000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

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
        showFeedback('⚠️ Formato inválido. Exporta desde FLAD actualizado.', 'warning');
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

      showFeedback(`✓ Base cargada: ${selectedContract} - ${selectedLine} (${fechaFormateada})`);
    } catch (error) {
      showFeedback('Error al cargar el archivo JSON', 'error');
      console.error(error);
    } finally {
      setSelectedContract(null);
      setSelectedLine(null);
      e.target.value = '';
    }
  };

  const handleDeleteDatabase = (contract: ContractType, line: LineType) => {
    setDeleteModal({ contract, line });
  };

  const confirmDelete = () => {
    if (!deleteModal || isDeleting) return;
    
    setIsDeleting(true);
    
    const updatedDBs = loadedDatabases.filter(
      db => !(db.contract === deleteModal.contract && db.line === deleteModal.line)
    );
    
    setLoadedDatabases(updatedDBs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDBs));
    setForceUpdate(prev => prev + 1);
    setDeleteModal(null);
    setIsDeleting(false);
    showFeedback('Base de datos eliminada');
  };

  const exportarConsolidado = async () => {
    if (loadedDatabases.length === 0) {
      showFeedback('No hay bases de datos cargadas', 'warning');
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      // HOJA 1: Consolidado General (solo campos de BD real)
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
          'Plazo Observación': req.plazo_observacion || 0,
          'Plazo Total': req.plazo_total,
          'Fecha Límite': req.fecha_limite,
          'Fecha Recepción': req.fecha_recepcion || '',
          'Días Atraso': req.dias_atraso || 0,
          Multa: req.multa,
          'Sobre Costo': req.sobre_costo,
          'A Pago': req.a_pago,
          Utilidades: req.utilidades,
          IVA: req.iva,
          'Total Línea': req.total_linea,
          Descripción: req.descripcion || '',
          Observaciones: req.observaciones || '',
          Estado: req.estado,
          'OT Código': req.ot_codigo || '',
          'Informe Código': req.informe_codigo || ''
        }));
      });

      const wsConsolidado = XLSX.utils.json_to_sheet(todosRequerimientos);
      XLSX.utils.book_append_sheet(workbook, wsConsolidado, 'Consolidado');

      // HOJA 2: Resumen por Jardín
      const resumenJardines = new Map<string, { cantidad: number; monto: number }>();
      loadedDatabases.forEach(db => {
        const enriquecidos = enriquecerRequerimientos(db.data.requerimientos, db.data);
        enriquecidos.forEach(req => {
          const key = `${req.jardin_nombre} (${req.jardin_codigo})`;
          const current = resumenJardines.get(key) || { cantidad: 0, monto: 0 };
          resumenJardines.set(key, {
            cantidad: current.cantidad + 1,
            monto: current.monto + req.total_linea
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
        showFeedback('✓ Archivo Excel exportado correctamente');
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      showFeedback('Error al exportar el archivo', 'error');
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

      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg border animate-fade-in ${
          feedback.type === 'success' ? 'bg-green-900/20 text-green-400 border-green-500' :
          feedback.type === 'error' ? 'bg-red-900/20 text-red-400 border-red-500' :
          'bg-yellow-900/15 text-yellow-400 border-yellow-500/30'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Modal Confirmación Borrar */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteModal(null)}>
          <div className="bg-[#1a2332] border border-[#2d3e50] rounded-lg p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#e0e6ed] mb-3">Confirmar eliminación</h3>
            <p className="text-[#8b9eb3] mb-6">
              ¿Eliminar base de datos <span className="text-[#5a8fc4] font-medium">{deleteModal.contract} - {deleteModal.line}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 bg-[#2d3e50] text-[#8b9eb3] rounded-lg hover:bg-[#3d4e60] transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
