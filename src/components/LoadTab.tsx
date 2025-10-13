import { Download, FileSpreadsheet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DatabaseJSON, ContractType, LineType, LoadedDatabase } from '../types';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const STORAGE_KEY = 'flad_loaded_databases';

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

  const contracts: { id: ContractType; label: string }[] = [
    { id: 'mantencion', label: 'Mantención' },
    { id: 'calefaccion', label: 'Calefacción' },
    { id: 'area_verde', label: 'Áreas Verdes' },
    { id: 'ascensores', label: 'Ascensores' }
  ];

  const lines: { id: LineType; label: string }[] = [
    { id: 'linea_1', label: 'Línea 1' },
    { id: 'linea_2', label: 'Línea 2' },
    { id: 'linea_3', label: 'Línea 3' },
    { id: 'linea_4', label: 'Línea 4' },
    { id: 'linea_5', label: 'Línea 5' }
  ];

  const isLoaded = (contract: ContractType, line: LineType): boolean => {
    return loadedDatabases.some(db => db.contract === contract && db.line === line);
  };

  const getFechaImportacion = (contract: ContractType, line: LineType): string => {
    const db = loadedDatabases.find(db => db.contract === contract && db.line === line);
    return db?.fechaImportacion || '';
  };

  const formatearFecha = (isoDate: string): string => {
    const fecha = new Date(isoDate);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
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
      const data: DatabaseJSON = JSON.parse(text);
      const fechaFormateada = formatearFecha(data.metadata.fecha_exportacion);
      
      const newDB: LoadedDatabase = {
        contract: selectedContract,
        line: selectedLine,
        data,
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

  const exportarConsolidado = async () => {
    if (loadedDatabases.length === 0) {
      alert('No hay bases de datos cargadas');
      return;
    }

    try {
      // Consolidar todos los requerimientos
      const todosRequerimientos = loadedDatabases.flatMap(db => 
        db.data.datos.requerimientos.map(req => ({
          ...req,
          contrato: db.contract,
          linea: db.line
        }))
      );

      // Generar CSV
      const headers = [
        'contrato',
        'linea',
        'id',
        'jardin_codigo',
        'jardin_nombre',
        'recinto',
        'partida_item',
        'partida_nombre',
        'partida_unidad',
        'cantidad',
        'plazo',
        'plazo_adicional',
        'descripcion',
        'observaciones',
        'precio_unitario',
        'precio_total',
        'fecha_inicio',
        'plazo_total',
        'fecha_limite',
        'fecha_registro',
        'estado',
        'ot_id',
        'fecha_recepcion',
        'dias_atraso',
        'multa',
        'a_pago',
        'informe_pago_id'
      ];

      const csvContent = [
        headers.join(','),
        ...todosRequerimientos.map(req => 
          headers.map(h => {
            const value = req[h as keyof typeof req];
            const stringValue = value === null || value === undefined ? '' : String(value);
            // Escapar comillas y envolver en comillas si contiene comas
            return stringValue.includes(',') || stringValue.includes('"') 
              ? `"${stringValue.replace(/"/g, '""')}"` 
              : stringValue;
          }).join(',')
        )
      ].join('\n');

      // Abrir diálogo de guardado
      const filePath = await save({
        defaultPath: `consolidado_${new Date().toISOString().split('T')[0]}.csv`,
        filters: [{
          name: 'CSV',
          extensions: ['csv']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, csvContent);
        alert('✓ Archivo exportado correctamente');
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
              {contracts.map(contract => (
                <th key={contract.id} className="text-center py-1.5 px-1 text-[#8b9eb3] font-medium text-xs">
                  {contract.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody key={forceUpdate}>
            {lines.map(line => (
              <tr key={line.id} className="border-b border-[#2d3e50]/50">
                <td className="py-1.5 px-1 text-[#e0e6ed] font-medium text-xs">{line.label}</td>
                {contracts.map(contract => {
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
                      <button
                        onClick={() => handleButtonClick(contract.id, line.id)}
                        className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                          loaded
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                        title={`${contract.label} - ${line.label}${loaded ? ` (${fecha})` : ''}`}
                      >
                        {loaded ? fecha : <Download className="w-3 h-3" />}
                      </button>
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
