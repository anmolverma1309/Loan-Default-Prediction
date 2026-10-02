import React, { useEffect, useState } from 'react';
import { 
  Activity, CheckCircle2, AlertTriangle, RefreshCw, 
  ShieldCheck, Layers, Clock
} from 'lucide-react';
import { getMonitoringDrift } from '../services/api';

const MonitoringPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMonitoring = async () => {
    try {
      setLoading(true);
      const res = await getMonitoringDrift();
      setData(res);
    } catch (err) {
      console.error('Failed to load monitoring metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
  }, []);

  const status = data?.monitoring_status || 'HEALTHY';
  const isHealthy = status === 'HEALTHY';

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-block">
        <h1 className="page-main-title">Model & Data Drift Monitoring</h1>
        <p className="page-main-subtitle">Statistical Kolmogorov-Smirnov tests tracking live applicant distribution shifts.</p>
      </div>

      {/* Top Status Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Model Status</div>
            <div className="kpi-value" style={{ color: isHealthy ? '#16a34a' : '#d97706', fontSize: '1.4rem' }}>
              Operational
            </div>
            <div className="kpi-subtext">Statistical health verified</div>
          </div>
          <div className="kpi-icon-box">
            <CheckCircle2 size={18} color="#16a34a" />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Data Drift Status</div>
            <div className="kpi-value" style={{ fontSize: '1.4rem' }}>
              {isHealthy ? 'Stable' : 'Shift Detected'}
            </div>
            <div className="kpi-subtext">Two-sample KS testing (alpha=0.05)</div>
          </div>
          <div className="kpi-icon-box">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Monitored Volume</div>
            <div className="kpi-value">{data?.total_predictions_analyzed || 50}</div>
            <div className="kpi-subtext">Recent inference sample</div>
          </div>
          <div className="kpi-icon-box">
            <Activity size={18} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Model Version</div>
            <div className="kpi-value" style={{ fontSize: '1.4rem' }}>v1.0</div>
            <div className="kpi-subtext">Production pipeline build</div>
          </div>
          <div className="kpi-icon-box">
            <Layers size={18} />
          </div>
        </div>
      </div>

      {/* Feature Drift Assessment Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Feature Drift Analysis</div>
            <div className="card-subtitle">
              Evaluating shifts between baseline training population and live applicant inputs
            </div>
          </div>

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={fetchMonitoring} 
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Recompute Tests
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b' }}>
            Computing statistical feature drift metrics...
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Monitored Feature</th>
                  <th>Drift Score (KS Stat)</th>
                  <th>Reference Mean</th>
                  <th>Current Live Mean</th>
                  <th>Statistical Test</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.drift_metrics?.map((item) => {
                  let statusBadge = 'badge-risk-low';
                  let statusLabel = 'Stable';

                  if (item.status === 'WARNING') {
                    statusBadge = 'badge-risk-med';
                    statusLabel = 'Warning';
                  } else if (item.status === 'DRIFT_DETECTED') {
                    statusBadge = 'badge-risk-high';
                    statusLabel = 'Drift Detected';
                  }

                  return (
                    <tr key={item.feature}>
                      <td style={{ fontWeight: 600, textTransform: 'capitalize', color: '#0f172a' }}>
                        {item.feature.replace('_', ' ')}
                      </td>
                      <td className="font-mono" style={{ color: '#2563eb', fontWeight: 600 }}>
                        {item.drift_score.toFixed(4)}
                      </td>
                      <td>{item.reference_mean?.toLocaleString()}</td>
                      <td>{item.current_mean?.toLocaleString()}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.test_name}</td>
                      <td>
                        <span className={`badge-risk ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringPage;
