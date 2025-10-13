interface BienvenidaProps {
  onContinue: () => void;
}

export function Bienvenida({ onContinue }: BienvenidaProps) {
  return (
    <div className="w-full flex justify-center items-center">
      <div className="bg-[#1a2332] border border-[#2d3e50] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-[900px] w-full p-12 animate-[fadeInUp_0.6s_ease-out]">
        
        <div className="text-center mb-10">
          <div className="w-[120px] h-[120px] bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_10px_30px_rgba(102,126,234,0.4)]">
            <span className="text-[2.5rem] font-extrabold text-white tracking-[2px]">FLAD</span>
          </div>
          <h1 className="text-[1.8rem] font-bold text-[#e0e6ed] m-0 leading-[1.3]">
            Sistema de Análisis de Requerimientos
          </h1>
        </div>

        <div className="mb-10">
          <p className="text-base leading-[1.7] text-[#a8b5c7] mb-4 text-justify">
            FLAD Análisis procesa múltiples bases de datos de contratos de mantención para generar 
            análisis estadísticos consolidados. El sistema permite combinar datos de diferentes 
            contratos y líneas presupuestarias, aplicar filtros personalizados por jardín, y 
            visualizar métricas de desempeño en tiempo real.
          </p>
          
          <p className="text-base leading-[1.7] text-[#a8b5c7] mb-4 text-justify">
            Las capacidades incluyen: importación de bases de datos JSON, filtrado granular de 
            jardines por contrato, análisis de cantidades y montos por estado, y visualización de 
            evolución temporal mediante gráficos interactivos que muestran tendencias mensuales 
            y semanales de cada categoría.
          </p>
          
          <p className="text-base leading-[1.7] text-[#a8b5c7] mb-4 text-justify">
            El sistema automatiza cálculos de porcentajes, genera gráficos de distribución y 
            evolución temporal, y mantiene sincronización entre filtros y análisis. Los tres 
            módulos operan integrados para optimizar el análisis multi-contrato de mantención 
            en jardines infantiles JUNJI.
          </p>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mt-8">
            <div className="flex items-center gap-4 p-4 bg-[#0f1419] rounded-xl border-2 border-[#2d3e50] transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_4px_12px_rgba(90,143,196,0.3)] hover:border-[#5a8fc4]">
              <div className="w-10 h-10 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-[10px] flex items-center justify-center text-[1.25rem] font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-[0.95rem] font-semibold text-[#e0e6ed] m-0 mb-1">Carga</h3>
                <p className="text-[0.8rem] text-[#8b9eb3] m-0 text-left">
                  Importación de bases de datos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-[#0f1419] rounded-xl border-2 border-[#2d3e50] transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_4px_12px_rgba(90,143,196,0.3)] hover:border-[#5a8fc4]">
              <div className="w-10 h-10 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-[10px] flex items-center justify-center text-[1.25rem] font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-[0.95rem] font-semibold text-[#e0e6ed] m-0 mb-1">Filtros</h3>
                <p className="text-[0.8rem] text-[#8b9eb3] m-0 text-left">
                  Selección de jardines
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-[#0f1419] rounded-xl border-2 border-[#2d3e50] transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_4px_12px_rgba(90,143,196,0.3)] hover:border-[#5a8fc4]">
              <div className="w-10 h-10 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-[10px] flex items-center justify-center text-[1.25rem] font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-[0.95rem] font-semibold text-[#e0e6ed] m-0 mb-1">Análisis</h3>
                <p className="text-[0.8rem] text-[#8b9eb3] m-0 text-left">
                  Estadísticas y gráficos
                </p>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={onContinue}
          className="w-full p-4 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white border-none rounded-xl text-[1.1rem] font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_15px_rgba(102,126,234,0.4)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.6)] active:translate-y-0"
        >
          Comenzar
        </button>

        <div className="text-center mt-6">
          <p className="text-xs text-[#6b7d8f] m-1 leading-[1.4]">
            Créditos: Daniel Mena Flores, 2025.
          </p>
          <p className="text-xs text-[#6b7d8f] m-1 leading-[1.4]">
            Desarrollado con Claude Sonnet 4.5
          </p>
          <p className="text-xs text-[#5a8fc4] font-semibold mt-2 m-1 leading-[1.4]">
            Versión 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
