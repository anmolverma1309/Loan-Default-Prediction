import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Send, History, Database, 
  Trophy, Activity, Shield, ExternalLink
} from 'lucide-react';

import DashboardPage from './pages/DashboardPage';
import PredictionPage from './pages/PredictionPage';
import ModelPerformancePage from './pages/ModelPerformancePage';
import EDAPage from './pages/EDAPage';
import PredictionHistoryPage from './pages/PredictionHistoryPage';
import MonitoringPage from './pages/MonitoringPage';
import { getHealth } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPredictionId, setSelectedPredictionId] = useState(null);
  const [systemHealth, setSystemHealth] = useState({ status: 'healthy', active_model: 'XGBoost', version: '1.0' });

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const health = await getHealth();
        setSystemHealth(health);
      } catch (err) {
        console.warn('API health check pending:', err.message);
      }
    };
    checkSystem();
    const interval = setInterval(checkSystem, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPredictionFromDashboard = (id) => {
    setSelectedPredictionId(id);
    setActiveTab('history');
  };

  const getPageHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'predict': return 'Predictions';
      case 'history': return 'Prediction History';
      case 'eda': return 'EDA & Insights';
      case 'models': return 'Model Performance';
      case 'monitoring': return 'Monitoring';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Shield size={20} />
          </div>
          <div>
            <div className="sidebar-logo-title">LoanRisk</div>
            <div className="sidebar-logo-subtitle">Credit Analytics</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'predict' ? 'active' : ''}`}
            onClick={() => setActiveTab('predict')}
          >
            <Send size={17} />
            <span>Predictions</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setSelectedPredictionId(null); setActiveTab('history'); }}
          >
            <History size={17} />
            <span>Prediction History</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'eda' ? 'active' : ''}`}
            onClick={() => setActiveTab('eda')}
          >
            <Database size={17} />
            <span>EDA & Insights</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            <Trophy size={17} />
            <span>Model Performance</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            <Activity size={17} />
            <span>Monitoring</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status-pill">
            <div className="status-dot" />
            <span>System Online</span>
          </div>
          <div className="sidebar-footer-sub">
            Model v1.0 • {systemHealth.active_model || 'XGBoost'}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Minimal Top Bar */}
        <header className="top-navbar">
          <div className="page-title-group">
            <h1>{getPageHeaderTitle()}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
              System Operational
            </div>

            <div style={{ fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              Model v1.0
            </div>

            <a 
              href="http://localhost:8000/docs" 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-secondary btn-sm" 
              style={{ fontSize: '0.74rem', padding: '4px 10px', gap: '4px' }}
            >
              API Docs
              <ExternalLink size={11} />
            </a>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="content-wrapper">
          {activeTab === 'dashboard' && (
            <DashboardPage 
              onNavigateToPredict={() => setActiveTab('predict')} 
              onSelectPrediction={handleSelectPredictionFromDashboard}
            />
          )}

          {activeTab === 'predict' && (
            <PredictionPage />
          )}

          {activeTab === 'history' && (
            <PredictionHistoryPage 
              selectedIdFromNav={selectedPredictionId} 
              onNavigateToPredict={() => setActiveTab('predict')}
            />
          )}

          {activeTab === 'eda' && (
            <EDAPage />
          )}

          {activeTab === 'models' && (
            <ModelPerformancePage />
          )}

          {activeTab === 'monitoring' && (
            <MonitoringPage />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
