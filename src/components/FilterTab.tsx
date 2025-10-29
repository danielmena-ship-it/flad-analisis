import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DatabaseJSON, ContractType, LineType, LoadedDatabase } from '../types';
import { CONTRACTS, LINES, STORAGE_KEY, FILTERS_KEY } from '../constants';

interface FilterTabProps {
  data: DatabaseJSON | null;
  filters?: any;
  onFilterChange: (filters: any) => void;
}

export function FilterTab({ data: _data, onFilterChange: _onFilterChange }: FilterTabProps) {
  const [loadedDatabases, setLoadedDatabases] = useState<LoadedDatabase[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedJardines, setSelectedJardines] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const restored: LoadedDatabase[] = JSON.parse(saved);
        setLoadedDatabases(restored);
        
        // Cargar filtros guardados
        const savedFilters = localStorage.getItem(FILTERS_KEY);
        let filters: Record<string, string[]> = {};
        
        if (savedFilters) {
          try {
            filters = JSON.parse(savedFilters);
          } catch (error) {
            console.error('Error restaurando filtros:', error);
          }
        }
        
        // Inicializar con todos los jardines seleccionados para BDs sin filtros
        const initializedFilters = { ...filters };
        restored.forEach(db => {
          const key = `${db.contract}-${db.line}`;
          if (!initializedFilters[key] || initializedFilters[key].length === 0) {
            initializedFilters[key] = db.data.jardines.map(j => j.codigo);
          }
        });
        
        setSelectedJardines(initializedFilters);
        
      } catch (error) {
        console.error('Error restaurando:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(selectedJardines).length > 0) {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(selectedJardines));
    }
  }, [selectedJardines]);

  const getDatabase = (contract: ContractType, line: LineType) => {
    return loadedDatabases.find(db => db.contract === contract && db.line === line);
  };

  const getKey = (contract: ContractType, line: LineType) => `${contract}-${line}`;

  const toggleDropdown = (contract: ContractType, line: LineType) => {
    const key = getKey(contract, line);
    setOpenDropdown(openDropdown === key ? null : key);
  };

  const handleJardinToggle = (contract: ContractType, line: LineType, jardinCodigo: string) => {
    const key = getKey(contract, line);
    const current = selectedJardines[key] || [];
    
    const updated = current.includes(jardinCodigo)
      ? current.filter(j => j !== jardinCodigo)
      : [...current, jardinCodigo];
    
    setSelectedJardines(prev => ({
      ...prev,
      [key]: updated
    }));
  };

  const handleSelectAll = (contract: ContractType, line: LineType) => {
    const key = getKey(contract, line);
    const db = getDatabase(contract, line);
    if (!db) return;

    const current = selectedJardines[key] || [];
    const allJardines = db.data.jardines.map(j => j.codigo);
    
    // Si todos están seleccionados, deseleccionar todos. Si no, seleccionar todos.
    const updated = current.length === allJardines.length ? [] : allJardines;
    
    setSelectedJardines(prev => ({
      ...prev,
      [key]: updated
    }));
  };

  const isAllSelected = (contract: ContractType, line: LineType): boolean => {
    const key = getKey(contract, line);
    const db = getDatabase(contract, line);
    if (!db) return false;
    
    const current = selectedJardines[key] || [];
    return current.length === db.data.jardines.length && current.length > 0;
  };

  const getSelectedCount = (contract: ContractType, line: LineType) => {
    const key = getKey(contract, line);
    return (selectedJardines[key] || []).length;
  };

  return (
    <div className="px-6 pb-6">
      <div className="mb-4 max-w-5xl mx-auto">
        <p className="text-sm text-[#8b9eb3]">
          Seleccione los jardines a analizar para cada contrato y línea
        </p>
      </div>

      <div className="bg-[#1a2332] border border-[#2d3e50] rounded-lg p-4 max-w-5xl mx-auto">
        <table className="table-fixed w-full">
          <colgroup>
            <col className="w-24" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-36" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#2d3e50]">
              <th className="text-left py-2 px-3 text-[#8b9eb3] font-medium text-sm">Línea</th>
              {CONTRACTS.map(contract => (
                <th key={contract.id} className="text-center py-2 px-3 text-[#8b9eb3] font-medium text-sm">
                  {contract.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINES.map(line => (
              <tr key={line.id} className="border-b border-[#2d3e50]/50">
                <td className="py-2 px-3 text-[#e0e6ed] font-medium text-sm">{line.label}</td>
                {CONTRACTS.map(contract => {
                  const db = getDatabase(contract.id, line.id);
                  const key = getKey(contract.id, line.id);
                  const isOpen = openDropdown === key;
                  const selectedCount = getSelectedCount(contract.id, line.id);
                  const totalJardines = db?.data.jardines.length || 0;
                  
                  return (
                    <td key={key} className="py-2 px-3 text-center relative">
                      {db ? (
                        <div className="relative">
                          <button
                            onClick={() => toggleDropdown(contract.id, line.id)}
                            className="px-3 py-2 rounded text-sm font-medium transition-all bg-[#4a6c8f] hover:bg-[#5a7c9f] text-white flex items-center gap-2 justify-center w-full"
                          >
                            <span>{selectedCount}/{totalJardines}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isOpen && (
                            <div className="absolute top-full left-0 mt-1 bg-[#1a2332] border border-[#2d3e50] rounded-lg shadow-xl z-50 min-w-[240px] max-h-[340px] overflow-y-auto">
                              <div className="p-2">
                                <label className="flex items-start gap-2 px-2 py-2 hover:bg-[#2d3e50] rounded cursor-pointer border-b border-[#2d3e50] mb-1">
                                  <input
                                    type="checkbox"
                                    checked={isAllSelected(contract.id, line.id)}
                                    onChange={() => handleSelectAll(contract.id, line.id)}
                                    className="w-3.5 h-3.5 accent-[#5a8fc4] mt-0.5 flex-shrink-0"
                                  />
                                  <span className="text-sm text-[#5a8fc4] font-semibold leading-tight">Todos</span>
                                </label>
                                {db.data.jardines.map(jardin => {
                                  const selected = (selectedJardines[key] || []).includes(jardin.codigo);
                                  return (
                                    <label
                                      key={jardin.codigo}
                                      className="flex items-start gap-2 px-2 py-2 hover:bg-[#2d3e50] rounded cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => handleJardinToggle(contract.id, line.id, jardin.codigo)}
                                        className="w-3.5 h-3.5 accent-[#5a8fc4] mt-0.5 flex-shrink-0"
                                      />
                                      <span className="text-sm text-[#e0e6ed] leading-tight">{jardin.codigo} - {jardin.nombre}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="px-2 py-1.5 rounded text-xs bg-[#2d3e50]/30 text-[#6b7d8f]">
                          —
                        </div>
                      )}
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
        className="hidden"
      />
    </div>
  );
}
