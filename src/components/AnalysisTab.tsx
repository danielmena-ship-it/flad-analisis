import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { BarChart3, FileDown, Filter, X } from 'lucide-react';
import { RequerimientoStatus, Requerimiento, LoadedDatabase } from '../types';
import { STATUS_LABELS, STATUS_COLORS, calculateStats, getRequerimientoStatus } from '../utils';
import { FilterTab } from './FilterTab';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

const STORAGE_KEY = 'flad_loaded_databases';
const FILTERS_KEY = 'flad_filters';

// Paleta de colores pasteles profesionales
// const PASTEL_COLORS = {
//   primary: '#6B9BD1',      // Azul pastel
//   secondary: '#A8C5E0',    // Azul claro
//   success: '#88D498',      // Verde pastel
//   danger: '#F3A0A0',       // Rojo pastel
//   warning: '#F4D186',      // Amarillo pastel
//   info: '#95C8D8',         // Cyan pastel
//   muted: '#B8C5D6',        // Gris azulado
//   bg: '#F8FAFC',           // Fondo muy claro
//   bgAlt: '#EEF2F7',        // Fondo alternativo
//   text: '#334155',         // Texto oscuro
//   textLight: '#64748B'     // Texto claro
// };


export function AnalysisTab() {
  const [viewMode, setViewMode] = useState<'cantidades' | 'montos'>('cantidades');
  const [periodMode, setPeriodMode] = useState<'mensual' | 'semanal'>('mensual');
  const [loadedDatabases, setLoadedDatabases] = useState<LoadedDatabase[]>([]);
  const [selectedJardines, setSelectedJardines] = useState<Record<string, string[]>>({});
  const [modalFiltrosAbierto, setModalFiltrosAbierto] = useState(false);

  // Recargar filtros cuando se cierra el modal
  useEffect(() => {
    if (!modalFiltrosAbierto) {
      const savedFilters = localStorage.getItem(FILTERS_KEY);
      if (savedFilters) {
        try {
          setSelectedJardines(JSON.parse(savedFilters));
        } catch (error) {
          console.error('Error recargando filtros:', error);
        }
      }
    }
  }, [modalFiltrosAbierto]);

  useEffect(() => {
    const savedDBs = localStorage.getItem(STORAGE_KEY);
    if (savedDBs) {
      try {
        setLoadedDatabases(JSON.parse(savedDBs));
      } catch (error) {
        console.error('Error cargando BDs:', error);
      }
    }

    const savedFilters = localStorage.getItem(FILTERS_KEY);
    if (savedFilters) {
      try {
        setSelectedJardines(JSON.parse(savedFilters));
      } catch (error) {
        console.error('Error cargando filtros:', error);
      }
    }
  }, []);

  const combinedRequerimientos = useMemo(() => {
    const allRequerimientos: Requerimiento[] = [];

    loadedDatabases.forEach(db => {
      const key = `${db.contract}-${db.line}`;
      const filteredJardines = selectedJardines[key] || [];

      if (filteredJardines.length === 0) {
        return;
      }

      const reqs = db.data.datos.requerimientos.filter(req => 
        filteredJardines.includes(req.jardin_codigo)
      );

      allRequerimientos.push(...reqs);
    });

    return allRequerimientos;
  }, [loadedDatabases, selectedJardines]);

  const stats = useMemo(() => {
    if (combinedRequerimientos.length === 0) return null;
    return calculateStats(combinedRequerimientos);
  }, [combinedRequerimientos]);

  const temporalData = useMemo(() => {
    if (combinedRequerimientos.length === 0) return [];

    const grouped = new Map<string, Record<RequerimientoStatus, number>>();

    combinedRequerimientos.forEach(req => {
      const fecha = new Date(req.fecha_registro);
      let key: string;

      if (periodMode === 'mensual') {
        key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const startOfYear = new Date(fecha.getFullYear(), 0, 1);
        const days = Math.floor((fecha.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        key = `${fecha.getFullYear()}-S${String(weekNum).padStart(2, '0')}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          pagado: 0,
          recibido: 0,
          atrasado: 0,
          en_curso: 0,
          sin_curso: 0
        });
      }

      const status = getRequerimientoStatus(req);
      const value = viewMode === 'cantidades' ? 1 : (req.a_pago ? req.a_pago : req.precio_total);
      grouped.get(key)![status] += value;
    });

    const sorted = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return sorted.map(([periodo, valores]) => ({
      periodo,
      ...valores,
      total: Object.values(valores).reduce((sum, val) => sum + val, 0)
    }));
  }, [combinedRequerimientos, periodMode, viewMode]);

  const formatYAxis = (value: number) => {
    if (viewMode === 'montos') {
      const millones = Math.round(value / 1000000);
      return `MM$${millones}`;
    }
    return value.toString();
  };

  const formatTooltip = (value: number) => {
    if (viewMode === 'montos') {
      const millones = Math.round(value / 1000000);
      return `MM$${millones}`;
    }
    return value;
  };

  if (loadedDatabases.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#6b7d8f]">
        <p>Primero cargue bases de datos en la pestaña Carga</p>
      </div>
    );
  }

  if (!stats || combinedRequerimientos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#6b7d8f]">
        <p>No hay datos para analizar. Seleccione jardines en Filtros.</p>
      </div>
    );
  }

  const data = Object.entries(stats[viewMode]).map(([key, value]) => ({
    name: STATUS_LABELS[key as RequerimientoStatus],
    value: value,
    color: STATUS_COLORS[key as RequerimientoStatus]
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const exportarPDF = async () => {
    try {
      // Abrir diálogo de guardado
      const fecha = new Date().toISOString().split('T')[0];
      const filePath = await save({
        defaultPath: `analisis_flad_${fecha}.pdf`,
        filters: [{
          name: 'PDF',
          extensions: ['pdf']
        }]
      });

      if (!filePath) return; // Usuario canceló

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Contador de páginas de antecedentes (se actualizará dinámicamente)
      let currentAntecedentesPage = 1;

      // Helper: Agregar header y footer (sin número de página aún)
      const addPageTemplate = (pageNum?: number, totalPages?: number) => {
        // Fondo
        pdf.setFillColor(248, 250, 252); // PASTEL_COLORS.bg
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header con banda de color
        pdf.setFillColor(107, 155, 209); // PASTEL_COLORS.primary
        pdf.rect(0, 0, pageWidth, 12, 'F');
        
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        pdf.text('FLAD Análisis', margin, 8);
        pdf.text(new Date().toLocaleDateString('es-CL'), pageWidth - margin, 8, { align: 'right' });

        // Footer (solo si se proporcionan números de página)
        if (pageNum !== undefined && totalPages !== undefined) {
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139); // PASTEL_COLORS.textLight
          pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      };

      // ========== SECCIÓN DE ANTECEDENTES (Páginas 1 a N) ==========
      addPageTemplate(); // Sin números aún

      // Título principal
      let yPos = 25;
      pdf.setFontSize(22);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Contexto del Análisis', margin, yPos);

      yPos += 8;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${combinedRequerimientos.length} requerimientos | ${loadedDatabases.length} base(s) de datos`, margin, yPos);

      yPos += 15;

      // SECCIÓN 1: Fechas de bases de datos cargadas
      pdf.setFontSize(16);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bases de Datos Cargadas', margin, yPos);

      yPos += 10;

      const contracts = [
        { id: 'mantencion', label: 'Mantención' },
        { id: 'calefaccion', label: 'Calefacción' },
        { id: 'area_verde', label: 'Áreas Verdes' },
        { id: 'ascensores', label: 'Ascensores' }
      ];

      const lines = [
        { id: 'linea_1', label: 'L1' },
        { id: 'linea_2', label: 'L2' },
        { id: 'linea_3', label: 'L3' },
        { id: 'linea_4', label: 'L4' },
        { id: 'linea_5', label: 'L5' }
      ];

      // Listado compacto de BDs
      loadedDatabases.forEach(db => {
        const contract = contracts.find(c => c.id === db.contract);
        const line = lines.find(l => l.id === db.line);

        if (contract && line) {
          // Verificar si necesitamos nueva página
          if (yPos > pageHeight - 40) {
            pdf.addPage();
            currentAntecedentesPage++;
            addPageTemplate();
            yPos = 25;
          }

          pdf.setFontSize(9);
          pdf.setTextColor(51, 65, 85);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${contract.label} - ${line.label}`, margin + 4, yPos);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 116, 139);
          pdf.text(`(${db.fechaImportacion})`, margin + 4 + pdf.getTextWidth(`${contract.label} - ${line.label} `) + 2, yPos);
          yPos += 6;
        }
      });

      yPos += 10;

      // Verificar espacio antes de la sección de jardines
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        currentAntecedentesPage++;
        addPageTemplate();
        yPos = 25;
      }

      // SECCIÓN 2: Jardines seleccionados
      pdf.setFontSize(16);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Jardines Seleccionados', margin, yPos);

      yPos += 10;

      // Mostrar jardines seleccionados
      contracts.forEach(contract => {
        lines.forEach(line => {
          const key = `${contract.id}-${line.id}`;
          const jardines = selectedJardines[key] || [];
          const db = loadedDatabases.find(d => d.contract === contract.id && d.line === line.id);

          if (jardines.length > 0 && db) {
            // Verificar si necesitamos nueva página
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              currentAntecedentesPage++;
              addPageTemplate();
              yPos = 25;
            }

            pdf.setFillColor(238, 242, 247);
            pdf.roundedRect(margin, yPos, contentWidth, 7, 2, 2, 'F');
            pdf.setFontSize(9);
            pdf.setTextColor(51, 65, 85);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${contract.label} - ${line.label}`, margin + 4, yPos + 4.5);
            yPos += 10;

            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139);
            pdf.setFont('helvetica', 'normal');
            
            let jardinText = jardines.join(', ');
            const textLines = pdf.splitTextToSize(jardinText, contentWidth - 8);
            textLines.forEach((line: string) => {
              // Verificar espacio para cada línea de texto
              if (yPos > pageHeight - 30) {
                pdf.addPage();
                currentAntecedentesPage++;
                addPageTemplate();
                yPos = 25;
              }
              pdf.text(line, margin + 4, yPos);
              yPos += 4;
            });
            
            yPos += 4;
          }
        });
      });

      // Total de páginas = páginas de antecedentes + 1 página de análisis
      const totalPages = currentAntecedentesPage + 1;

      // Actualizar números de página en todas las páginas de antecedentes
      for (let i = 1; i <= currentAntecedentesPage; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // ========== PÁGINA FINAL: Análisis Estadístico (SIEMPRE EN UNA SOLA PÁGINA) ==========
      pdf.addPage();
      addPageTemplate(totalPages, totalPages);

      yPos = 25;
      pdf.setFontSize(22);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Análisis Estadístico', margin, yPos);

      yPos += 8;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Resultados del análisis de requerimientos', margin, yPos);

      yPos += 12;
      
      // Tarjeta de resumen
      pdf.setFillColor(238, 242, 247);
      pdf.roundedRect(margin, yPos, contentWidth, 75, 3, 3, 'F');
      
      yPos += 8;
      pdf.setFontSize(14);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumen por Categoría', margin + 5, yPos);

      yPos += 10;
      
      // Headers de tabla
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Categoría', margin + 10, yPos);
      pdf.text(viewMode === 'cantidades' ? 'Cantidad' : 'Monto', margin + contentWidth - 50, yPos, { align: 'right' });
      pdf.text('%', margin + contentWidth - 10, yPos, { align: 'right' });

      yPos += 2;
      pdf.setDrawColor(184, 197, 214); // PASTEL_COLORS.muted
      pdf.setLineWidth(0.3);
      pdf.line(margin + 10, yPos, margin + contentWidth - 10, yPos);
      yPos += 6;

      // Filas de datos
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      data.forEach((item) => {
        // Indicador de color
        const [r, g, b] = [
          parseInt(item.color.slice(1, 3), 16),
          parseInt(item.color.slice(3, 5), 16),
          parseInt(item.color.slice(5, 7), 16)
        ];
        pdf.setFillColor(r, g, b);
        pdf.circle(margin + 12, yPos - 1.5, 2, 'F');
        
        // Datos
        pdf.setTextColor(51, 65, 85);
        pdf.text(item.name, margin + 18, yPos);
        pdf.text(
          viewMode === 'cantidades' ? item.value.toLocaleString('es-CL') : `$${item.value.toLocaleString('es-CL')}`,
          margin + contentWidth - 50,
          yPos,
          { align: 'right' }
        );
        pdf.setTextColor(100, 116, 139);
        pdf.text(`${((item.value / total) * 100).toFixed(1)}%`, margin + contentWidth - 10, yPos, { align: 'right' });
        
        yPos += 6;
      });

      // Total
      yPos += 2;
      pdf.setLineWidth(0.5);
      pdf.line(margin + 10, yPos, margin + contentWidth - 10, yPos);
      yPos += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(51, 65, 85);
      pdf.text('Total', margin + 18, yPos);
      pdf.text(
        viewMode === 'cantidades' ? total.toLocaleString('es-CL') : `$${total.toLocaleString('es-CL')}`,
        margin + contentWidth - 50,
        yPos,
        { align: 'right' }
      );
      pdf.text('100%', margin + contentWidth - 10, yPos, { align: 'right' });

      // Gráfico de distribución (torta)
      yPos += 15;
      pdf.setFontSize(14);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Distribución por Categoría', margin, yPos);

      yPos += 5;
      const pieCharts = document.querySelectorAll('.recharts-wrapper');
      const pieChart = pieCharts[0] as HTMLElement;
      if (pieChart) {
        const canvas = await html2canvas(pieChart, { backgroundColor: '#F8FAFC', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth * 0.6;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin + (contentWidth - imgWidth) / 2, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }

      // Gráfico de evolución temporal
      pdf.setFontSize(14);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Evolución Temporal (${periodMode === 'mensual' ? 'Mensual' : 'Semanal'})`, margin, yPos);

      yPos += 5;
      const lineChart = pieCharts[1] as HTMLElement;
      if (lineChart) {
        const canvas = await html2canvas(lineChart, { backgroundColor: '#F8FAFC', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = Math.min((canvas.height * imgWidth) / canvas.width, 80);
        pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
      }

      // Guardar PDF
      const pdfBlob = pdf.output('blob');
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const pdfBytes = new Uint8Array(pdfArrayBuffer);
      
      await writeFile(filePath, pdfBytes);
      alert('✓ PDF exportado correctamente');
      
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar el PDF');
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#e0e6ed] flex items-center gap-3">
              <BarChart3 className="w-7 h-7" />
              Análisis Estadístico
            </h2>
            <p className="text-sm text-[#8b9eb3] mt-1">
              {combinedRequerimientos.length} requerimientos de {loadedDatabases.length} bases de datos
            </p>
          </div>
          <div className="flex gap-2 ml-6">
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
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setModalFiltrosAbierto(true)}
            className="px-5 py-2.5 rounded-lg font-medium transition bg-[#f59e0b] hover:bg-[#e08e0a] text-white flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={exportarPDF}
            className="px-5 py-2.5 rounded-lg font-medium transition bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1a2332] border border-[#2d3e50] rounded-lg p-6 shadow-xl">
          <h3 className="font-semibold text-[#a8c5e0] mb-4">Resumen por Categoría</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2d3e50]">
                <th className="text-left py-3 text-[#8b9eb3] font-medium">Categoría</th>
                <th className="text-right py-3 text-[#8b9eb3] font-medium">{viewMode === 'cantidades' ? 'Cantidad' : 'Monto'}</th>
                <th className="text-right py-3 text-[#8b9eb3] font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.name} className="border-b border-[#2d3e50]/50">
                  <td className="py-3 flex items-center gap-2 text-[#e0e6ed]">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </td>
                  <td className="text-right text-[#e0e6ed]">
                    {viewMode === 'cantidades' ? item.value : `$${item.value.toLocaleString('es-CL')}`}
                  </td>
                  <td className="text-right text-[#8b9eb3]">
                    {((item.value / total) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="font-semibold text-[#a8c5e0]">
                <td className="py-3">Total</td>
                <td className="text-right">
                  {viewMode === 'cantidades' ? total : `$${total.toLocaleString('es-CL')}`}
                </td>
                <td className="text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-[#1a2332] border border-[#2d3e50] rounded-lg p-6 shadow-xl">
          <h3 className="font-semibold text-[#a8c5e0] mb-4">Gráfico de Distribución</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const RADIAN = Math.PI / 180;
                  const { cx, cy, midAngle, outerRadius, percent, name } = props;
                  const radius = outerRadius + 30;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#8b9eb3"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      fontSize="12"
                    >
                      {`${name}: ${(percent * 100).toFixed(1)}%`}
                    </text>
                  );
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => 
                  viewMode === 'cantidades' ? value : `$${value.toLocaleString('es-CL')}`
                }
                contentStyle={{ 
                  backgroundColor: '#1a2332', 
                  border: '1px solid #2d3e50', 
                  color: '#e0e6ed',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#e0e6ed' }}
                itemStyle={{ color: '#e0e6ed' }}
              />
              <Legend wrapperStyle={{ color: '#8b9eb3' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 bg-[#1a2332] border border-[#2d3e50] rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="font-semibold text-[#a8c5e0]">Evolución Temporal</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriodMode('mensual')}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm ${periodMode === 'mensual' ? 'bg-[#5a8fc4] text-white' : 'bg-[#2d3e50] text-[#8b9eb3] hover:bg-[#1a2332]'}`}
            >
              Mensual
            </button>
            <button
              onClick={() => setPeriodMode('semanal')}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm ${periodMode === 'semanal' ? 'bg-[#5a8fc4] text-white' : 'bg-[#2d3e50] text-[#8b9eb3] hover:bg-[#1a2332]'}`}
            >
              Semanal
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={temporalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3e50" />
            <XAxis 
              dataKey="periodo" 
              stroke="#8b9eb3"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#8b9eb3"
              style={{ fontSize: '12px' }}
              tickFormatter={formatYAxis}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{ 
                backgroundColor: '#1a2332', 
                border: '1px solid #2d3e50', 
                color: '#e0e6ed',
                borderRadius: '8px'
              }}
            />
            <Legend wrapperStyle={{ color: '#8b9eb3' }} />
            <Line 
              type="monotone" 
              dataKey="pagado" 
              stroke={STATUS_COLORS.pagado} 
              name={STATUS_LABELS.pagado}
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="recibido" 
              stroke={STATUS_COLORS.recibido} 
              name={STATUS_LABELS.recibido}
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="atrasado" 
              stroke={STATUS_COLORS.atrasado} 
              name={STATUS_LABELS.atrasado}
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="en_curso" 
              stroke={STATUS_COLORS.en_curso} 
              name={STATUS_LABELS.en_curso}
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="sin_curso" 
              stroke={STATUS_COLORS.sin_curso} 
              name={STATUS_LABELS.sin_curso}
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#a8c5e0" 
              name="Total"
              strokeWidth={3}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Modal de Filtros */}
      {modalFiltrosAbierto && (
        <div 
          className="fixed inset-0 bg-[rgba(15,20,25,0.95)] backdrop-blur-sm flex items-center justify-center z-[9999] p-8 overflow-y-auto"
          onClick={() => setModalFiltrosAbierto(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f1419] border border-[#2d3e50] rounded-xl shadow-2xl w-full max-w-6xl my-auto"
          >
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-[#1a2332] to-[#2d3e50] px-6 py-4 border-b border-[#2d3e50] flex justify-between items-center">
              <h3 className="text-xl font-semibold text-[#e0e6ed] flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros por Jardín
              </h3>
              <button
                onClick={() => setModalFiltrosAbierto(false)}
                className="p-2 hover:bg-[#1a2332] rounded-lg transition text-[#8b9eb3] hover:text-[#e0e6ed]"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Contenido del Modal */}
            <div className="py-6">
              <FilterTab 
                data={null} 
                filters={{}} 
                onFilterChange={() => {}} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
