import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { BarChart3, FileDown, Filter, X, ChevronDown, Calendar } from 'lucide-react';
import { RequerimientoStatus, Requerimiento, LoadedDatabase } from '../types';
import { STATUS_LABELS, STATUS_COLORS, calculateStats, getRequerimientoStatus, calcularRangoAtajo, generarTextoRango, validarFechaEnRango } from '../utils';
import { CONTRACTS, LINES, STORAGE_KEY, FILTERS_KEY } from '../constants';
import { FilterTab } from './FilterTab';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

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


const ANALYSIS_DATE_FILTERS_KEY = 'flad-analisis-analysis-date-filters';

export function AnalysisTab() {
  const [viewMode, setViewMode] = useState<'cantidades' | 'montos'>('cantidades');
  const [tipoDropdownOpen, setTipoDropdownOpen] = useState(false);
  const [periodMode, setPeriodMode] = useState<'mensual' | 'semanal'>('mensual');
  const [loadedDatabases, setLoadedDatabases] = useState<LoadedDatabase[]>([]);
  const [selectedJardines, setSelectedJardines] = useState<Record<string, string[]>>({});
  const [modalFiltrosAbierto, setModalFiltrosAbierto] = useState(false);
  const [modalFechasAbierto, setModalFechasAbierto] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [top50GraficoExpanded, setTop50GraficoExpanded] = useState(false);
  const [top50TablaExpanded, setTop50TablaExpanded] = useState(false);

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
    let databases: LoadedDatabase[] = [];
    
    if (savedDBs) {
      try {
        databases = JSON.parse(savedDBs);
        setLoadedDatabases(databases);
      } catch (error) {
        console.error('Error cargando BDs:', error);
      }
    }

    const savedFilters = localStorage.getItem(FILTERS_KEY);
    let filters: Record<string, string[]> = {};
    
    if (savedFilters) {
      try {
        filters = JSON.parse(savedFilters);
      } catch (error) {
        console.error('Error cargando filtros:', error);
      }
    }
    
    // INICIALIZAR FILTROS AUTOMÁTICAMENTE: Si no hay filtros o están vacíos,
    // seleccionar todos los jardines de cada BD cargada
    const initializedFilters = { ...filters };
    let needsUpdate = false;
    
    databases.forEach(db => {
      const key = `${db.contract}-${db.line}`;
      if (!initializedFilters[key] || initializedFilters[key].length === 0) {
        initializedFilters[key] = db.data.jardines.map(j => j.codigo);
        needsUpdate = true;
      }
    });
    
    setSelectedJardines(initializedFilters);
    
    // Guardar filtros inicializados
    if (needsUpdate) {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(initializedFilters));
    }

    // Cargar fechas
    const savedDates = localStorage.getItem(ANALYSIS_DATE_FILTERS_KEY);
    if (savedDates) {
      try {
        const { desde, hasta } = JSON.parse(savedDates);
        if (desde) setFechaDesde(desde);
        if (hasta) setFechaHasta(hasta);
      } catch (error) {
        console.error('Error cargando fechas:', error);
      }
    }
  }, []);

  // Guardar fechas
  useEffect(() => {
    localStorage.setItem(ANALYSIS_DATE_FILTERS_KEY, JSON.stringify({ desde: fechaDesde, hasta: fechaHasta }));
  }, [fechaDesde, fechaHasta]);

  const limpiarFechas = () => {
    setFechaDesde('');
    setFechaHasta('');
  };

  const aplicarAtajoFecha = (tipo: 'mes' | '30dias' | 'trimestre') => {
    const { desde, hasta } = calcularRangoAtajo(tipo);
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  const rangoActivo = useMemo(() => {
    return Boolean(fechaDesde || fechaHasta);
  }, [fechaDesde, fechaHasta]);

  const rangoTexto = useMemo(() => {
    return generarTextoRango(fechaDesde, fechaHasta);
  }, [fechaDesde, fechaHasta]);

  const combinedRequerimientos = useMemo(() => {
    const allRequerimientos: Requerimiento[] = [];

    loadedDatabases.forEach(db => {
      const key = `${db.contract}-${db.line}`;
      const filteredJardines = selectedJardines[key] || [];

      if (filteredJardines.length === 0) {
        return;
      }

      const reqs = db.data.requerimientos.filter(req => {
        if (!filteredJardines.includes(req.jardin_codigo)) return false;

        // Filtro por fechas
        if (!validarFechaEnRango(req.fecha_limite, fechaDesde, fechaHasta)) {
          return false;
        }

        return true;
      });

      allRequerimientos.push(...reqs);
    });

    return allRequerimientos;
  }, [loadedDatabases, selectedJardines, fechaDesde, fechaHasta]);

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
      const value = viewMode === 'cantidades' ? 1 : req.total_linea;
      grouped.get(key)![status] += value;
    });

    const sorted = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return sorted.map(([periodo, valores]) => ({
      periodo,
      ...valores,
      total: Object.values(valores).reduce((sum, val) => sum + val, 0)
    }));
  }, [combinedRequerimientos, periodMode, viewMode]);

  // Calcular Top 50 Partidas
  const top50Partidas = useMemo(() => {
    if (combinedRequerimientos.length === 0) return [];

    // Agrupar por partida_item
    const partidasMap = new Map<string, { cantidad: number; monto: number; descripcion: string }>();

    combinedRequerimientos.forEach(req => {
      if (!partidasMap.has(req.partida_item)) {
        // Buscar descripción en las BDs cargadas
        let descripcion = req.partida_item;
        for (const db of loadedDatabases) {
          const partida = db.data.partidas.find(p => p.item === req.partida_item);
          if (partida) {
            descripcion = partida.partida;
            break;
          }
        }
        partidasMap.set(req.partida_item, { cantidad: 0, monto: 0, descripcion });
      }

      const entry = partidasMap.get(req.partida_item)!;
      entry.cantidad += 1;
      entry.monto += req.total_linea;
    });

    // Convertir a array y ordenar según viewMode
    const partidasArray = Array.from(partidasMap.entries()).map(([item, data]) => ({
      item,
      descripcion: data.descripcion,
      cantidad: data.cantidad,
      monto: data.monto
    }));

    const sortKey = viewMode === 'cantidades' ? 'cantidad' : 'monto';
    partidasArray.sort((a, b) => b[sortKey] - a[sortKey]);

    // Tomar top 50
    const top50 = partidasArray.slice(0, 50);

    // Calcular total para porcentajes
    const totalCantidad = combinedRequerimientos.length;
    const totalMonto = combinedRequerimientos.reduce((sum, req) => sum + req.total_linea, 0);

    return top50.map((p, index) => ({
      ...p,
      ranking: index + 1,
      cantidadPct: (p.cantidad / totalCantidad) * 100,
      montoPct: (p.monto / totalMonto) * 100
    }));
  }, [combinedRequerimientos, viewMode, loadedDatabases]);

  const formatYAxis = (value: number) => {
    if (viewMode === 'montos') {
      const millones = Math.round(value / 1000000);
      return `MM$${millones}`;
    }
    return value.toString();
  };

  const formatTooltip = (value: number | undefined) => {
    if (value === undefined) return '';
    if (viewMode === 'montos') {
      const millones = Math.round(value / 1000000);
      return `MM$${millones}`;
    }
    return value;
  };

  // Tooltip customizado para Top Partidas
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1a2332] border border-[#2d3e50] rounded-lg p-3" style={{ color: '#e0e6ed' }}>
          <p className="font-semibold text-[#5a8fc4] mb-1">{data.item}</p>
          <p className="text-sm text-[#8b9eb3] mb-2">{data.descripcion}</p>
          <p className="text-[#e0e6ed]">
            {viewMode === 'montos' 
              ? `monto: MM$${Math.round(data.monto / 1000000)}`
              : `cantidad: ${data.cantidad}`
            }
          </p>
        </div>
      );
    }
    return null;
  };

  if (loadedDatabases.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#6b7d8f]">
        <p>Primero cargue bases de datos en la pestaña Carga</p>
      </div>
    );
  }

  const data = stats && combinedRequerimientos.length > 0 ? Object.entries(stats[viewMode]).map(([key, value]) => ({
    name: STATUS_LABELS[key as RequerimientoStatus],
    value: value,
    color: STATUS_COLORS[key as RequerimientoStatus]
  })) : [];

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

      // Usar labels cortas para PDF
      const linesShort = LINES.map(l => ({ 
        id: l.id, 
        label: l.label.replace('Línea ', 'L') 
      }));

      // Listado compacto de BDs
      loadedDatabases.forEach(db => {
        const contract = CONTRACTS.find(c => c.id === db.contract);
        const line = linesShort.find(l => l.id === db.line);

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
      CONTRACTS.forEach(contract => {
        linesShort.forEach(line => {
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

      // ========== PÁGINA TOP PARTIDAS (máx 20) ==========
      pdf.addPage();
      const partidasPageNum = totalPages + 1;
      addPageTemplate(partidasPageNum, partidasPageNum);

      yPos = 25;
      pdf.setFontSize(22);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Top Partidas', margin, yPos);

      yPos += 8;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Ordenado por ${viewMode === 'cantidades' ? 'cantidad de requerimientos' : 'monto total'}`, margin, yPos);

      yPos += 12;

      // Gráfico Top 20
      const barCharts = document.querySelectorAll('.recharts-wrapper');
      const barChart = barCharts[2] as HTMLElement;
      if (barChart) {
        const canvas = await html2canvas(barChart, { backgroundColor: '#F8FAFC', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth * 0.7;
        const imgHeight = Math.min((canvas.height * imgWidth) / canvas.width, 80);
        pdf.addImage(imgData, 'PNG', margin + (contentWidth - imgWidth) / 2, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }

      // Tabla Top 30
      pdf.setFontSize(12);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Top 30', margin, yPos);
      yPos += 8;

      // Headers de tabla
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'bold');
      pdf.text('#', margin + 5, yPos);
      pdf.text('Item', margin + 15, yPos);
      pdf.text('Partida', margin + 35, yPos);
      if (viewMode === 'cantidades') {
        pdf.text('Cant.', margin + contentWidth - 18, yPos, { align: 'right' });
        pdf.text('%', margin + contentWidth - 5, yPos, { align: 'right' });
      } else {
        pdf.text('Monto', margin + contentWidth - 18, yPos, { align: 'right' });
        pdf.text('%', margin + contentWidth - 5, yPos, { align: 'right' });
      }

      yPos += 2;
      pdf.setDrawColor(184, 197, 214);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 5, yPos, margin + contentWidth - 5, yPos);
      yPos += 6;

      // Filas de datos (máximo 30)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      top50Partidas.slice(0, 30).forEach((partida, index) => {
        // Normalizar texto: reemplazar caracteres especiales
        const normalizedDesc = partida.descripcion
          .replace(/[""″]/g, '"')  // Comillas tipográficas y símbolo pulgadas
          .replace(/['']/g, "'")    // Apóstrofes tipográficos
          .replace(/–/g, '-')       // Guión largo
          .replace(/…/g, '...')     // Puntos suspensivos
          .trim();
        
        // Dividir descripción manualmente por ancho
        const maxDescWidth = contentWidth - 45;  // Más espacio con columnas ajustadas
        const words = normalizedDesc.split(' ');
        const descLines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (pdf.getTextWidth(testLine) > maxDescWidth) {
            if (currentLine) {
              descLines.push(currentLine);
              currentLine = word;
            } else {
              // Palabra muy larga, forzar corte
              descLines.push(word);
            }
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) descLines.push(currentLine);
        
        // Limitar a 2 líneas
        if (descLines.length > 2) {
          descLines.length = 2;
          descLines[1] = descLines[1] + '...';
        }
        
        const rowHeight = Math.max(4.5, descLines.length * 2.5 + 1.5);

        // Alternar color de fondo
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin + 5, yPos - 3.5, contentWidth - 10, rowHeight, 'F');
        }

        pdf.setTextColor(51, 65, 85);
        pdf.text(partida.ranking.toString(), margin + 5, yPos);
        pdf.text(partida.item, margin + 15, yPos);
        
        // Imprimir descripción
        descLines.forEach((line, lineIndex) => {
          pdf.text(line, margin + 35, yPos + (lineIndex * 2.5));
        });

        if (viewMode === 'cantidades') {
          pdf.text(partida.cantidad.toString(), margin + contentWidth - 18, yPos, { align: 'right' });
          pdf.text(`${partida.cantidadPct.toFixed(1)}%`, margin + contentWidth - 5, yPos, { align: 'right' });
        } else {
          pdf.text(`$${Math.round(partida.monto).toLocaleString('es-CL')}`, margin + contentWidth - 18, yPos, { align: 'right' });
          pdf.text(`${partida.montoPct.toFixed(1)}%`, margin + contentWidth - 5, yPos, { align: 'right' });
        }

        yPos += rowHeight;
      });

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
          {/* Dropdown Tipo */}
          <div className="relative ml-6">
            <button
              onClick={() => setTipoDropdownOpen(!tipoDropdownOpen)}
              className="px-5 py-2.5 rounded-lg font-medium transition bg-[#2d3e50] text-[#e0e6ed] hover:bg-[#1a2332] flex items-center gap-2"
            >
              Tipo
              <ChevronDown className="w-4 h-4" />
            </button>
            {tipoDropdownOpen && (
              <div className="absolute top-full mt-1 bg-[#1a2332] border border-[#2d3e50] rounded-lg shadow-xl z-10 min-w-[160px]">
                <button
                  onClick={() => { setViewMode('cantidades'); setTipoDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left hover:bg-[#2d3e50] transition ${viewMode === 'cantidades' ? 'text-[#5a8fc4]' : 'text-[#e0e6ed]'}`}
                >
                  Cantidades
                </button>
                <button
                  onClick={() => { setViewMode('montos'); setTipoDropdownOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left hover:bg-[#2d3e50] transition ${viewMode === 'montos' ? 'text-[#5a8fc4]' : 'text-[#e0e6ed]'}`}
                >
                  Montos
                </button>
              </div>
            )}
          </div>
          {/* Botones Filtros y Fechas */}
          <button
            onClick={() => setModalFiltrosAbierto(true)}
            className="px-5 py-2.5 rounded-lg font-medium transition bg-[#f59e0b] hover:bg-[#e08e0a] text-white flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Jardin
          </button>
          <button
            onClick={() => setModalFechasAbierto(true)}
            title="Filtra requerimientos a partir de su fecha límite"
            className="px-5 py-2.5 rounded-lg font-medium transition bg-[#8b5cf6] hover:bg-[#7c3aed] text-white flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Fechas
          </button>
          {rangoActivo && (
            <span className="text-xs text-[#64748b] self-center">{rangoTexto}</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportarPDF}
            className="px-5 py-2.5 rounded-lg font-medium transition bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Contenido condicional */}
      {!stats || combinedRequerimientos.length === 0 ? (
        <div className="flex items-center justify-center h-96 text-[#6b7d8f]">
          <div className="text-center">
            <Filter size={48} className="mx-auto mb-4 text-[#4b5563]" />
            <p className="text-lg">No hay datos para analizar.</p>
            <p className="text-sm mt-2">Seleccione jardines en Filtros o ajuste el rango de fechas.</p>
          </div>
        </div>
      ) : (
        <>
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
                formatter={(value: number | undefined) => 
                  value === undefined ? '' : (viewMode === 'cantidades' ? value : `$${value.toLocaleString('es-CL')}`)
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

      {/* Panel Top Partidas */}
      <div className="mt-8 bg-[#1a2332] border border-[#2d3e50] rounded-lg p-6 shadow-xl">
        <h3 className="font-semibold text-[#a8c5e0] mb-4">Top Partidas</h3>
        
        {/* Gráfico */}
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={top50GraficoExpanded ? 1200 : 600}>
            <BarChart 
              data={top50Partidas.slice(0, top50GraficoExpanded ? 50 : 20)} 
              layout="vertical"
              margin={{ left: 60, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3e50" />
              <XAxis 
                type="number" 
                stroke="#8b9eb3"
                style={{ fontSize: '11px' }}
                tickFormatter={formatYAxis}
              />
              <YAxis 
                type="category" 
                dataKey="item" 
                stroke="#8b9eb3"
                style={{ fontSize: '11px' }}
                width={50}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }}
              />
              <Bar 
                dataKey={viewMode === 'cantidades' ? 'cantidad' : 'monto'} 
                fill="#667eea"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          {top50Partidas.length > 20 && (
            <button
              onClick={() => setTop50GraficoExpanded(!top50GraficoExpanded)}
              className="w-full mt-2 py-2 text-sm text-[#8b9eb3] hover:text-[#a8c5e0] hover:bg-[#2d3e50]/30 rounded transition-colors"
            >
              {top50GraficoExpanded 
                ? '▲ Contraer gráfico' 
                : `▼ Ver más (${top50Partidas.length - 20} partidas restantes)`
              }
            </button>
          )}
        </div>

        {/* Tabla completa */}
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr className="border-b border-[#2d3e50]">
                <th className="text-left py-3 px-3 text-[#8b9eb3] font-medium text-sm w-12">#</th>
                <th className="text-left py-3 px-3 text-[#8b9eb3] font-medium text-sm w-24">Item</th>
                <th className="text-left py-3 px-3 text-[#8b9eb3] font-medium text-sm">Partida</th>
                {viewMode === 'cantidades' ? (
                  <>
                    <th className="text-right py-3 px-3 text-[#8b9eb3] font-medium text-sm w-28">Cantidad</th>
                    <th className="text-right py-3 px-3 text-[#8b9eb3] font-medium text-sm w-16">%</th>
                  </>
                ) : (
                  <>
                    <th className="text-right py-3 px-3 text-[#8b9eb3] font-medium text-sm w-36">Monto</th>
                    <th className="text-right py-3 px-3 text-[#8b9eb3] font-medium text-sm w-16">%</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {top50Partidas.slice(0, top50TablaExpanded ? 50 : 10).map((partida) => (
                <tr key={partida.item} className="border-b border-[#2d3e50]/50 hover:bg-[#2d3e50]/30 transition-colors">
                  <td className="py-2.5 px-3 text-[#a8c5e0] text-sm">{partida.ranking}</td>
                  <td className="py-2.5 px-3 text-[#e0e6ed] text-sm font-medium">{partida.item}</td>
                  <td className="py-2.5 px-3 text-[#8b9eb3] text-sm">{partida.descripcion}</td>
                  {viewMode === 'cantidades' ? (
                    <>
                      <td className="py-2.5 px-3 text-right text-[#e0e6ed] text-sm">{partida.cantidad}</td>
                      <td className="py-2.5 px-3 text-right text-[#8b9eb3] text-sm">{partida.cantidadPct.toFixed(1)}%</td>
                    </>
                  ) : (
                    <>
                      <td className="py-2.5 px-3 text-right text-[#e0e6ed] text-sm">${partida.monto.toLocaleString('es-CL')}</td>
                      <td className="py-2.5 px-3 text-right text-[#8b9eb3] text-sm">{partida.montoPct.toFixed(1)}%</td>
                    </>
                  )}
                </tr>
              ))}
              
              {top50Partidas.length > 10 && (
                <tr 
                  onClick={() => setTop50TablaExpanded(!top50TablaExpanded)}
                  className="border-b border-[#2d3e50]/50 hover:bg-[#2d3e50]/50 cursor-pointer transition-colors"
                >
                  <td colSpan={5} className="py-3 px-3 text-center text-[#8b9eb3] hover:text-[#a8c5e0] text-sm">
                    {top50TablaExpanded 
                      ? '▲ Contraer tabla' 
                      : `▼ Ver más (${top50Partidas.length - 10} partidas restantes)`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Modal de Filtros */}

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

      {/* Modal Filtrar por Fechas */}
      {modalFechasAbierto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModalFechasAbierto(false)}>
          <div className="bg-[#1a2332] border border-[#2d3e50] rounded-xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#2d3e50]">
              <h3 className="text-lg font-semibold text-[#e0e6ed] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#8b5cf6]" />
                Filtrar por Fechas
              </h3>
              <button onClick={() => setModalFechasAbierto(false)} className="text-[#8b9eb3] hover:text-[#e0e6ed]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#8b9eb3] mb-1.5">Desde</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    max={fechaHasta || undefined}
                    style={{ colorScheme: 'dark' }}
                    className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3e50] rounded-lg text-[#e0e6ed] text-sm focus:outline-none focus:border-[#8b5cf6] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8b9eb3] mb-1.5">Hasta</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    min={fechaDesde || undefined}
                    style={{ colorScheme: 'dark' }}
                    className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3e50] rounded-lg text-[#e0e6ed] text-sm focus:outline-none focus:border-[#8b5cf6] transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#2d3e50]">
                <div className="flex gap-2">
                  <button
                    onClick={() => aplicarAtajoFecha('mes')}
                    className="flex-1 px-2 py-1.5 bg-[#2d3e50]/50 hover:bg-[#2d3e50] text-[#8b9eb3] hover:text-[#e0e6ed] rounded text-xs transition-colors"
                  >
                    Este mes
                  </button>
                  <button
                    onClick={() => aplicarAtajoFecha('30dias')}
                    className="flex-1 px-2 py-1.5 bg-[#2d3e50]/50 hover:bg-[#2d3e50] text-[#8b9eb3] hover:text-[#e0e6ed] rounded text-xs transition-colors"
                  >
                    Últ. 30 días
                  </button>
                  <button
                    onClick={() => aplicarAtajoFecha('trimestre')}
                    className="flex-1 px-2 py-1.5 bg-[#2d3e50]/50 hover:bg-[#2d3e50] text-[#8b9eb3] hover:text-[#e0e6ed] rounded text-xs transition-colors"
                  >
                    Trimestre
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between p-4 border-t border-[#2d3e50]">
              <button
                onClick={limpiarFechas}
                className="px-4 py-2 rounded-lg font-medium transition bg-[#2d3e50] hover:bg-[#3d4e60] text-[#e0e6ed] text-sm"
              >
                Limpiar
              </button>
              <button
                onClick={() => setModalFechasAbierto(false)}
                className="px-4 py-2 rounded-lg font-medium transition bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
