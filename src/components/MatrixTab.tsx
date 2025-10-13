import { useState, useEffect, useMemo } from 'react';
import { Filter, X, Grid3x3, ChevronRight, ChevronDown } from 'lucide-react';
import { Requerimiento, RequerimientoStatus, LoadedDatabase, ContractType, LineType } from '../types';
import { STATUS_LABELS, getRequerimientoStatus } from '../utils';

const STORAGE_KEY = 'flad_loaded_databases';
const MATRIX_FILTERS_KEY = 'flad_matrix_filters';

export function MatrixTab() {
  const [loadedDatabases, setLoadedDatabases] = useState<LoadedDatabase[]>([]);
  const [selectedStates, setSelectedStates] = useState<RequerimientoStatus[]>([]);
  const [modalFiltrosAbierto, setModalFiltrosAbierto] = useState(false);
  const [viewMode, setViewMode] = useState<'cantidades' | 'montos'>('cantidades');
  const [expandedLines, setExpandedLines] = useState<Set<LineType>>(new Set());

  // Cargar BDs y filtros
  useEffect(() => {
    const savedDBs = localStorage.getItem(STORAGE_KEY);
    if (savedDBs) {
      try {
        setLoadedDatabases(JSON.parse(savedDBs));
      } catch (error) {
        console.error('Error cargando BDs:', error);
      }
    }

    const savedFilters = localStorage.getItem(MATRIX_FILTERS_KEY);
    if (savedFilters) {
      try {
        setSelectedStates(JSON.parse(savedFilters));
      } catch (error) {
        console.error('Error cargando filtros matriz:', error);
        // Si hay error, inicializar con todos
        setSelectedStates(['pagado', 'recibido', 'atrasado', 'en_curso', 'sin_curso']);
      }
    } else {
      // Si no hay filtros guardados, inicializar con todos los estados
      setSelectedStates(['pagado', 'recibido', 'atrasado', 'en_curso', 'sin_curso']);
    }
  }, []);

  // Guardar filtros
  useEffect(() => {
    localStorage.setItem(MATRIX_FILTERS_KEY, JSON.stringify(selectedStates));
  }, [selectedStates]);

  // Obtener todos los requerimientos de las BDs cargadas
  const allRequerimientos = useMemo(() => {
    const reqs: Requerimiento[] = [];
    loadedDatabases.forEach(db => {
      reqs.push(...db.data.datos.requerimientos);
    });
    return reqs;
  }, [loadedDatabases]);

  // Filtrar requerimientos según estados seleccionados
  const filteredRequerimientos = useMemo(() => {
    if (selectedStates.length === 0) return [];
    
    return allRequerimientos.filter(req => {
      const status = getRequerimientoStatus(req);
      return selectedStates.includes(status);
    });
  }, [allRequerimientos, selectedStates]);

  const toggleState = (state: RequerimientoStatus) => {
    setSelectedStates(prev => 
      prev.includes(state)
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  const selectAll = () => {
    setSelectedStates(['pagado', 'recibido', 'atrasado', 'en_curso', 'sin_curso']);
  };

  const clearAll = () => {
    setSelectedStates([]);
  };

  // Calcular matriz de valores por jardín
  const matrixDataByJardin = useMemo(() => {
    const matrix: Record<string, Record<string, Record<string, number>>> = {};
    
    const contracts: ContractType[] = ['mantencion', 'calefaccion', 'area_verde', 'ascensores'];
    const lines: LineType[] = ['linea_1', 'linea_2', 'linea_3', 'linea_4', 'linea_5'];
    
    // Inicializar matriz
    lines.forEach(line => {
      matrix[line] = {};
      contracts.forEach(contract => {
        matrix[line][contract] = {};
      });
    });
    
    // Sumar valores por jardín
    loadedDatabases.forEach(db => {
      const dbRequerimientos = db.data.datos.requerimientos.filter(req => {
        const status = getRequerimientoStatus(req);
        return selectedStates.includes(status);
      });
      
      dbRequerimientos.forEach(req => {
        if (!matrix[db.line][db.contract][req.jardin_codigo]) {
          matrix[db.line][db.contract][req.jardin_codigo] = 0;
        }
        
        if (viewMode === 'cantidades') {
          matrix[db.line][db.contract][req.jardin_codigo] += 1;
        } else {
          const valor = req.a_pago ? req.a_pago : req.precio_total;
          matrix[db.line][db.contract][req.jardin_codigo] += valor;
        }
      });
    });
    
    return matrix;
  }, [loadedDatabases, selectedStates, viewMode]);

  // Obtener lista de jardines por línea
  const jardinesByLine = useMemo(() => {
    const jardines: Record<string, Array<{ codigo: string; nombre: string }>> = {};
    
    loadedDatabases.forEach(db => {
      if (!jardines[db.line]) {
        jardines[db.line] = db.data.catalogos.jardines;
      }
    });
    
    return jardines;
  }, [loadedDatabases]);

  const toggleLine = (lineId: LineType) => {
    setExpandedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineId)) {
        newSet.delete(lineId);
      } else {
        newSet.add(lineId);
      }
      return newSet;
    });
  };

  // Calcular matriz de valores
  const matrixData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    
    const contracts: ContractType[] = ['mantencion', 'calefaccion', 'area_verde', 'ascensores'];
    const lines: LineType[] = ['linea_1', 'linea_2', 'linea_3', 'linea_4', 'linea_5'];
    
    // Inicializar matriz en cero
    contracts.forEach(contract => {
      matrix[contract] = {};
      lines.forEach(line => {
        matrix[contract][line] = 0;
      });
    });
    
    // Sumar valores de requerimientos filtrados
    loadedDatabases.forEach(db => {
      const dbRequerimientos = db.data.datos.requerimientos.filter(req => {
        const status = getRequerimientoStatus(req);
        return selectedStates.includes(status);
      });
      
      dbRequerimientos.forEach(req => {
        if (viewMode === 'cantidades') {
          matrix[db.contract][db.line] += 1;
        } else {
          // Si tiene a_pago (fecha_recepcion presente), usar a_pago, sino usar precio_total
          const valor = req.a_pago ? req.a_pago : req.precio_total;
          matrix[db.contract][db.line] += valor;
        }
      });
    });
    
    return matrix;
  }, [loadedDatabases, selectedStates, viewMode]);

  const contracts = [
    { id: 'mantencion' as ContractType, label: 'Mantención' },
    { id: 'calefaccion' as ContractType, label: 'Calefacción' },
    { id: 'area_verde' as ContractType, label: 'Áreas Verdes' },
    { id: 'ascensores' as ContractType, label: 'Ascensores' }
  ];

  const lines = [
    { id: 'linea_1' as LineType, label: 'L1' },
    { id: 'linea_2' as LineType, label: 'L2' },
    { id: 'linea_3' as LineType, label: 'L3' },
    { id: 'linea_4' as LineType, label: 'L4' },
    { id: 'linea_5' as LineType, label: 'L5' }
  ];

  const formatMoney = (value: number) => {
    if (viewMode === 'cantidades') {
      return value.toString();
    }
    return `$${Math.round(value).toLocaleString('es-CL')}`;
  };

  // Calcular totales por columna (contrato)
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    contracts.forEach(contract => {
      totals[contract.id] = 0;
      lines.forEach(line => {
        totals[contract.id] += matrixData[contract.id][line.id];
      });
    });
    return totals;
  }, [matrixData]);

  // Calcular totales por fila (línea)
  const rowTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    lines.forEach(line => {
      totals[line.id] = 0;
      contracts.forEach(contract => {
        totals[line.id] += matrixData[contract.id][line.id];
      });
    });
    return totals;
  }, [matrixData]);

  // Calcular gran total
  const grandTotal = useMemo(() => {
    return Object.values(columnTotals).reduce((sum, val) => sum + val, 0);
  }, [columnTotals]);

  const states: RequerimientoStatus[] = ['pagado', 'recibido', 'atrasado', 'en_curso', 'sin_curso'];

  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-2xl font-semibold text-[#e0e6ed] flex items-center gap-3">
            <Grid3x3 className="w-7 h-7" />
            Matriz de Requerimientos
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('cantidades')}
              className={`px-5 py-2.5 rounded-lg font-medium transition ${viewMode === 'cantidades' ? 'bg-[#5a8fc4] text-white' : 'bg-[#2d3e50] text-[#8b9eb3] hover:bg-[#1a2332]'}`}
            >
              Cantidades
            </button>
            <button
              onClick={() => setViewMode('montos')}
              className={`px-5 py-2.5 rounded-lg font-medium transition ${viewMode === 'montos' ? 'bg-[#5a8fc4] text-white' : 'bg-[#2d3e50] text-[#8b9eb3] hover:bg-[#1a2332]'}`}
            >
              Montos
            </button>
          </div>
          <button
            onClick={() => setModalFiltrosAbierto(true)}
            className="px-5 py-2.5 rounded-lg font-medium transition bg-[#f59e0b] hover:bg-[#e08e0a] text-white flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>
        <p className="text-sm text-[#8b9eb3]">
          {filteredRequerimientos.length} requerimientos de {allRequerimientos.length} totales
        </p>
      </div>

      {/* Contenido - Matriz */}
      <div className="flex justify-center">
        {selectedStates.length === 0 ? (
          <div className="text-center py-20">
            <Filter size={48} className="mx-auto mb-4 text-[#4b5563]" />
            <p className="text-[#8b9eb3] text-lg">
              Selecciona al menos un estado en los filtros para visualizar la matriz
            </p>
          </div>
        ) : (
          <div className="bg-[#1a2332] border border-[#2d3e50] rounded-lg overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-auto table-auto">
                <thead>
                  <tr className="border-b-2 border-[#2d3e50] bg-gradient-to-br from-[#1a2332] to-[#2d3e50]">
                    <th className="px-3 py-3 text-left text-sm text-[#e0e6ed] font-semibold sticky left-0 bg-[#1a2332]">
                      Línea
                    </th>
                    {contracts.map(contract => (
                      <th key={contract.id} className="px-2.5 py-3 text-right text-sm text-[#e0e6ed] font-semibold whitespace-nowrap">
                        {contract.label}
                      </th>
                    ))}
                    <th className="px-2.5 py-3 text-right text-sm text-[#e0e6ed] font-semibold bg-[#667eea]/10 whitespace-nowrap">
                      Total
                    </th>
                    <th className="px-2.5 py-3 text-right text-sm text-[#e0e6ed] font-semibold bg-[#764ba2]/10">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Fila de totales */}
                  <tr className="border-b border-[#667eea]/30 bg-gradient-to-r from-[#667eea]/20 to-[#764ba2]/20">
                    <td className="px-3 py-3 text-sm text-[#e0e6ed] font-bold sticky left-0 bg-gradient-to-r from-[#667eea]/20 to-[#764ba2]/20">
                      Total
                    </td>
                    {contracts.map(contract => (
                      <td key={contract.id} className="px-2.5 py-3 text-right text-sm text-[#a8c5e0] font-semibold whitespace-nowrap">
                        {formatMoney(columnTotals[contract.id])}
                      </td>
                    ))}
                    <td className="px-2.5 py-3 text-right text-sm text-[#667eea] font-bold bg-[#667eea]/10 whitespace-nowrap">
                      {formatMoney(grandTotal)}
                    </td>
                    <td className="px-2.5 py-3 text-right text-sm text-[#764ba2] font-bold bg-[#764ba2]/10">
                      100%
                    </td>
                  </tr>

                  {/* Fila de porcentajes */}
                  <tr className="border-b-2 border-[#2d3e50] bg-gradient-to-r from-[#764ba2]/10 to-[#667eea]/10">
                    <td className="px-3 py-2.5 text-sm text-[#8b9eb3] font-medium sticky left-0 bg-gradient-to-r from-[#764ba2]/10 to-[#667eea]/10">
                      % Total
                    </td>
                    {contracts.map(contract => {
                      const percentage = grandTotal > 0 ? (columnTotals[contract.id] / grandTotal * 100).toFixed(1) : '0.0';
                      return (
                        <td key={contract.id} className="px-2.5 py-2.5 text-right text-[#8b9eb3] text-sm">
                          {percentage}%
                        </td>
                      );
                    })}
                    <td className="px-2.5 py-2.5 text-right text-sm text-[#667eea] bg-[#667eea]/5">
                      —
                    </td>
                    <td className="px-2.5 py-2.5 text-right text-sm text-[#764ba2] bg-[#764ba2]/5">
                      —
                    </td>
                  </tr>

                  {/* Filas de líneas */}
                  {lines.map(line => {
                    const isExpanded = expandedLines.has(line.id);
                    const jardines = jardinesByLine[line.id] || [];
                    
                    return (
                      <>
                        {/* Fila principal de línea */}
                        <tr 
                          key={line.id} 
                          className="border-b border-[#2d3e50]/50 hover:bg-[#5a8fc4]/10 transition-colors cursor-pointer bg-[#0f1419]"
                          onClick={() => toggleLine(line.id)}
                        >
                          <td className="px-3 py-2.5 text-sm text-[#e0e6ed] font-medium sticky left-0 bg-[#0f1419]">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-[#667eea]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[#5a8fc4]" />
                              )}
                              {line.label}
                            </div>
                          </td>
                          {contracts.map(contract => {
                            const value = matrixData[contract.id][line.id];
                            const hasData = loadedDatabases.some(
                              db => db.contract === contract.id && db.line === line.id
                            );
                            
                            return (
                              <td key={contract.id} className="px-2.5 py-2.5 text-right whitespace-nowrap">
                                {hasData ? (
                                  <span className={`text-sm ${value > 0 ? 'text-[#a8c5e0] font-semibold' : 'text-[#6b7d8f]'}`}>
                                    {formatMoney(value)}
                                  </span>
                                ) : (
                                  <span className="text-[#4b5563] text-sm">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2.5 py-2.5 text-right text-sm text-[#667eea] font-bold bg-[#667eea]/5 whitespace-nowrap">
                            {formatMoney(rowTotals[line.id])}
                          </td>
                          <td className="px-2.5 py-2.5 text-right text-sm text-[#764ba2] font-medium bg-[#764ba2]/5">
                            {grandTotal > 0 ? ((rowTotals[line.id] / grandTotal * 100).toFixed(1)) : '0.0'}%
                          </td>
                        </tr>

                        {/* Filas de jardines (expandidas) */}
                        {isExpanded && jardines.map(jardin => {
                          // Calcular total por jardín
                          const jardinTotal = contracts.reduce((sum, contract) => {
                            return sum + (matrixDataByJardin[line.id]?.[contract.id]?.[jardin.codigo] || 0);
                          }, 0);
                          
                          return (
                            <tr 
                              key={`${line.id}-${jardin.codigo}`}
                              className="border-b border-[#2d3e50]/20 bg-gradient-to-r from-[#1a2332] to-[#1a2332]/50 hover:bg-[#2d3e50]/30 transition-colors"
                            >
                              <td className="px-3 py-1.5 text-[#8b9eb3] text-xs pl-8 sticky left-0 bg-gradient-to-r from-[#1a2332] to-[#1a2332]/50 truncate" title={`${jardin.codigo} - ${jardin.nombre}`}>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-[#5a8fc4] flex-shrink-0"></span>
                                  <span className="truncate">{jardin.codigo}</span>
                                </span>
                              </td>
                              {contracts.map(contract => {
                                const value = matrixDataByJardin[line.id]?.[contract.id]?.[jardin.codigo] || 0;
                                
                                return (
                                  <td key={contract.id} className="px-1.5 py-1.5 text-right text-xs whitespace-nowrap">
                                    {value > 0 ? (
                                      <span className="text-[#a8c5e0]">{formatMoney(value)}</span>
                                    ) : (
                                      <span className="text-[#4b5563]">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-1.5 py-1.5 text-right text-xs text-[#8b9eb3] font-medium bg-[#667eea]/5 whitespace-nowrap">
                                {jardinTotal > 0 ? formatMoney(jardinTotal) : '—'}
                              </td>
                              <td className="px-1.5 py-1.5 text-right text-xs text-[#6b7d8f] bg-[#764ba2]/5">
                                {jardinTotal > 0 && grandTotal > 0 ? `${(jardinTotal / grandTotal * 100).toFixed(1)}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Filtros */}
      {modalFiltrosAbierto && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setModalFiltrosAbierto(false)}
        >
          <div 
            className="bg-[#1a2332] rounded-xl shadow-2xl w-64 mx-4 border border-[#2d3e50]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b border-[#2d3e50]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#5a8fc4]" />
                <h3 className="text-base font-semibold text-[#e0e6ed]">Filtrar por Estado</h3>
              </div>
              <button
                onClick={() => setModalFiltrosAbierto(false)}
                className="text-[#8b9eb3] hover:text-[#e0e6ed] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-3">
              <div className="space-y-1">
                {/* Opción Todos */}
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#2d3e50]/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedStates.length === states.length}
                    onChange={(e) => e.target.checked ? selectAll() : clearAll()}
                    className="w-4 h-4 rounded border-2 border-[#4b5563] bg-transparent checked:bg-[#5a8fc4] checked:border-[#5a8fc4] cursor-pointer accent-[#5a8fc4] flex-shrink-0"
                  />
                  <span className="text-[#a8c5e0] font-medium text-sm">Todos</span>
                </label>

                {/* Estados individuales */}
                {states.map(state => (
                  <label 
                    key={state}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#2d3e50]/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStates.includes(state)}
                      onChange={() => toggleState(state)}
                      className="w-4 h-4 rounded border-2 border-[#4b5563] bg-transparent checked:bg-[#5a8fc4] checked:border-[#5a8fc4] cursor-pointer accent-[#5a8fc4] flex-shrink-0"
                    />
                    <span className="text-[#a8c5e0] text-sm">{STATUS_LABELS[state]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer del modal */}
            <div className="flex justify-end p-4 border-t border-[#2d3e50]">
              <button
                onClick={() => setModalFiltrosAbierto(false)}
                className="px-4 py-2 rounded-lg font-medium transition bg-[#2d3e50] hover:bg-[#3d4e60] text-[#e0e6ed] text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
