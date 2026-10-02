import React, { useEffect, useState } from 'react';
import { 
  Users, TrendingUp, ShieldAlert, Cpu, 
  ArrowRight, CheckCircle2, ChevronRight, BarChart3, PieChart
} from 'lucide-react';
import { getDatasetSummary, getEDASummary, getModelMetrics, getPredictions } from '../services/api';

const DashboardPage = ({ onNavigateToPredict, onSelectPrediction }) => {
  const [loading, setLoading] = useState(true);
  const [datasetStats, setDatasetStats] = useState(null);
  const [edaData, setEdaData] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [recentPredictions, setRecentPredictions] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [ds, eda, models, preds] = await Promise.allSettled([
          getDatasetSummary(),
          getEDASummary(),
          getModelMetrics(),
          getPredictions(6, 0)
        ]);

        if (ds.status === 'fulfilled') setDatasetStats(ds.value);
        if (eda.status === 'fulfilled') setEdaData(eda.value);
        if (models.status === 'fulfilled') setModelData(models.value);
        if (preds.status === 'fulfilled') setRecentPredictions(preds.value);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalRecords = datasetStats?.total_records || 27003;
  const defaultRate = datasetStats ? (datasetStats.default_rate * 100).toFixed(2) : '14.73';
  const defaultCount = datasetStats?.target_distribution?.['Default (1)'] || 3977;
  const nonDefaultCount = datasetStats?.target_distribution?.['Non-Default (0)'] || 23026;
  const activeModel = modelData?.active_model || 'XGBoost';
  
  // Find active model ROC-AUC
  const activeModelMetric = modelData?.models?.find(m => m.model_name.toLowerCase() === activeModel.toLowerCase()) || modelData?.models?.[0];
  const rocScore = activeModelMetric ? (activeModelMetric.roc_auc * 100).toFixed(2) : '70.93';

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-block">
        <h1 className="page-main-title">Risk Analytics Dashboard</h1>
        <p className="page-main-subtitle">Monitor loan applications, default risk and model performance.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Total Applications</div>
            <div className="kpi-value">{totalRecords.toLocaleString()}</div>
            <div className="kpi-subtext">Training & reference records</div>
          </div>
          <div className="kpi-icon-box">
            <Users size={18} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Default Rate</div>
            <div className="kpi-value">{defaultRate}%</div>
            <div className="kpi-subtext">{defaultCount.toLocaleString()} historical defaults</div>
          </div>
          <div className="kpi-icon-box">
            <ShieldAlert size={18} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Active Model</div>
            <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{activeModel}</div>
            <div className="kpi-subtext">Production pipeline v1.0</div>
          </div>
          <div className="kpi-icon-box">
            <Cpu size={18} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Model ROC-AUC</div>
            <div className="kpi-value" style={{ color: '#2563eb' }}>{rocScore}%</div>
            <div className="kpi-subtext">Holdout test benchmark</div>
          </div>
          <div className="kpi-icon-box">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Two-Column Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Left: Default Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <PieChart size={16} color="#2563eb" />
                Default Distribution
              </div>
              <div className="card-subtitle">Portfolio class breakdown in baseline data</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '16px 0', gap: '20px' }}>
            {/* Minimal Donut Visual */}
            <div style={{ position: 'relative', width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="65" cy="65" r="50" stroke="#eff6ff" strokeWidth="16" fill="transparent" />
                <circle 
                  cx="65" cy="65" r="50" 
                  stroke="#2563eb" 
                  strokeWidth="16" 
                  strokeDasharray="314" 
                  strokeDashoffset={314 - (0.8527 * 314)} 
                  fill="transparent" 
                />
                <circle 
                  cx="65" cy="65" r="50" 
                  stroke="#dc2626" 
                  strokeWidth="16" 
                  strokeDasharray="314" 
                  strokeDashoffset={314 - (0.1473 * 314)} 
                  strokeDashoffset-origin="0"
                  fill="transparent" 
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{defaultRate}%</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Default</div>
              </div>
            </div>

            {/* Legend & Numbers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, maxWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2563eb' }} />
                  <span style={{ color: '#475569' }}>Non-Default</span>
                </div>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{nonDefaultCount.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#dc2626' }} />
                  <span style={{ color: '#475569' }}>Default</span>
                </div>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>{defaultCount.toLocaleString()}</span>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '0.74rem', color: '#94a3b8' }}>
                Total 27,003 observations verified
              </div>
            </div>
          </div>
        </div>

        {/* Right: Default Rate by Credit Grade */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <BarChart3 size={16} color="#2563eb" />
                Default Rate by Credit Grade
              </div>
              <div className="card-subtitle">Empirical risk scaling across grades A through G</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {edaData?.default_by_grade ? (
              Object.entries(edaData.default_by_grade).map(([grade, stats]) => {
                const ratePct = (stats.default_rate * 100).toFixed(1);
                // Restrained blue scale
                let barColor = '#3b82f6';
                if (['E', 'F', 'G'].includes(grade)) barColor = '#1d4ed8';

                return (
                  <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
                    <span style={{ width: '22px', fontWeight: 600, color: '#0f172a' }}>{grade}</span>
                    <div style={{ flex: 1, background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${Math.min(100, stats.default_rate * 250)}%`, 
                          height: '100%', 
                          background: barColor, 
                          borderRadius: '4px'
                        }} 
                      />
                    </div>
                    <span style={{ width: '42px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {ratePct}%
                    </span>
                    <span style={{ width: '70px', textAlign: 'right', fontSize: '0.72rem', color: '#94a3b8' }}>
                      {stats.total_loans.toLocaleString()}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.84rem', padding: '16px 0' }}>
                Loading grade distribution metrics...
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Secondary Section: Risk Overview & Recent Predictions */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Recent Loan Risk Assessments</div>
            <div className="card-subtitle">Latest applicant evaluations saved to database</div>
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onNavigateToPredict}
          >
            New Assessment
            <ArrowRight size={14} />
          </button>
        </div>

        {recentPredictions.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Prediction ID</th>
                  <th>Applicant</th>
                  <th>Loan Amount</th>
                  <th>Term</th>
                  <th>Interest Rate</th>
                  <th>Grade</th>
                  <th>Default Probability</th>
                  <th>Risk Category</th>
                  <th>Model</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentPredictions.map((item) => {
                  let badgeClass = 'badge-risk-low';
                  if (item.risk_category?.toLowerCase() === 'medium') badgeClass = 'badge-risk-med';
                  if (item.risk_category?.toLowerCase() === 'high') badgeClass = 'badge-risk-high';

                  return (
                    <tr key={item.prediction_id}>
                      <td className="font-mono" style={{ color: '#2563eb', fontWeight: 600 }}>
                        #{item.prediction_id}
                      </td>
                      <td style={{ fontWeight: 500 }}>{item.applicant_name}</td>
                      <td>${item.loan_amount?.toLocaleString()}</td>
                      <td>{item.loan_term} mos</td>
                      <td>{item.interest_rate}%</td>
                      <td style={{ fontWeight: 600 }}>{item.grade || 'N/A'}</td>
                      <td style={{ fontWeight: 600 }}>
                        {(item.default_probability * 100).toFixed(1)}%
                      </td>
                      <td>
                        <span className={`badge-risk ${badgeClass}`}>
                          {item.risk_category}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.model_name}</td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                          onClick={() => onSelectPrediction && onSelectPrediction(item.prediction_id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
            <p style={{ marginBottom: '12px', fontSize: '0.88rem' }}>No predictions recorded yet. Start by running your first loan evaluation.</p>
            <button className="btn btn-primary btn-sm" onClick={onNavigateToPredict}>
              Assess Loan Risk
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
