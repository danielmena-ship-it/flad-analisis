import { useState, useEffect } from 'react';
import { LoadTab } from './components/LoadTab';
import { MatrixTab } from './components/MatrixTab';
import { AnalysisTab } from './components/AnalysisTab';
import { Bienvenida } from './components/Bienvenida';
import './index.css';

type TabType = 'load' | 'matrix' | 'analysis';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('load');
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

  useEffect(() => {
    const bienvenidaVista = localStorage.getItem('flad_analisis_bienvenida_vista');
    if (!bienvenidaVista) {
      setMostrarBienvenida(true);
    }
  }, []);

  const cerrarBienvenida = () => {
    setMostrarBienvenida(false);
    localStorage.setItem('flad_analisis_bienvenida_vista', 'true');
  };

  const toggleBienvenida = () => {
    setMostrarBienvenida(!mostrarBienvenida);
  };

  const tabs = [
    { id: 'load' as TabType, label: 'Carga', num: '1.' },
    { id: 'matrix' as TabType, label: 'Matriz', num: '2.' },
    { id: 'analysis' as TabType, label: 'Análisis', num: '3.' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1419]">
      <header className="bg-gradient-to-br from-[#1a2332] to-[#2d3e50] border-b border-[#2d3e50]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleBienvenida}
              className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white px-4 py-2 rounded-lg font-bold tracking-wider text-base shadow-lg shadow-[#667eea]/30 hover:shadow-[#667eea]/50 hover:-translate-y-0.5 transition-all"
              title="Información del sistema"
            >
              FLAD
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-[#e0e6ed] tracking-tight">
                Análisis
              </h1>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-[#1a2332]/30 border-b border-[#2d3e50]">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex gap-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 font-medium rounded-lg
                  border-l-4 transition-all duration-200
                  ${activeTab === tab.id
                    ? 'border-[#5a8fc4] bg-[#1a2332] text-[#a8c5e0] font-semibold'
                    : 'border-[#5a8fc4]/20 bg-transparent text-[#8b9eb3] hover:bg-[#1a2332] hover:text-[#a8c5e0]'
                  }
                `}
              >
                <span className="text-lg">{tab.num}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'load' && <LoadTab />}
        {activeTab === 'matrix' && <MatrixTab />}
        {activeTab === 'analysis' && <AnalysisTab />}
      </main>

      {mostrarBienvenida && (
        <div 
          className="fixed inset-0 bg-[rgba(15,20,25,0.95)] backdrop-blur-sm flex items-start justify-center z-[9999] p-8 overflow-y-auto"
          onClick={cerrarBienvenida}
        >
          <div onClick={(e) => e.stopPropagation()} className="my-auto">
            <Bienvenida onContinue={cerrarBienvenida} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
