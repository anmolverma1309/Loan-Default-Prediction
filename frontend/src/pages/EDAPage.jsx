import React, { useEffect, useState } from 'react';
import { 
  Database, BarChart2, Hash, Percent, 
  Layers, Grid, FileText, CheckCircle2
} from 'lucide-react';
import { getEDASummary } from '../services/api';

const EDAPage = () => {
  const [edaData, setEdaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchEDA = async () => {
      try {
        setLoading(true);
        const res = await getEDASummary();
        setEdaData(res);
      } catch (err) {
        console.error('Failed to load EDA summary:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEDA();
  }, []);

  const ds = edaData?.dataset_summary;
  const missingTotal = ds?.missing_values ? Object.values(ds.missing_values).reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-block">
        <h1 className="page-main-title">Dataset & Insights</h1>
        <p className="page-main-subtitle">Explore patterns and distributions in the training dataset.</p>
      </div>

      {/* Top KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Records</div>
            <div className="kpi-value">{ds?.total_records?.toLocaleString() || '27,003'}</div>
            <div className="kpi-subtext">Cleaned training dataset</div>
          </div>
          <div className="kpi-icon-box"><Hash size={18} /></div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Features</div>
            <div className="kpi-value">{ds?.total_features || 47}</div>
            <div className="kpi-subtext">Application-time attributes</div>
          </div>
          <div className="kpi-icon-box"><Database size={18} /></div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Default Rate</div>
            <div className="kpi-value" style={{ color: '#dc2626' }}>
              {ds ? (ds.default_rate * 100).toFixed(2) : '14.73'}%
            </div>
            <div className="kpi-subtext">3,977 defaults vs 23,026 paid</div>
          </div>
          <div className="kpi-icon-box"><Percent size={18} /></div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Missing Values</div>
            <div className="kpi-value">{missingTotal.toLocaleString()}</div>
            <div className="kpi-subtext">Imputed in preprocessing</div>
          </div>
          <div className="kpi-icon-box"><FileText size={18} /></div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-group">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Database size={14} />
          Portfolio Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'categorical' ? 'active' : ''}`}
          onClick={() => setActiveTab('categorical')}
        >
          <BarChart2 size={14} />
          Categorical Risk Patterns
        </button>
        <button 
          className={`tab-btn ${activeTab === 'numerical' ? 'active' : ''}`}
          onClick={() => setActiveTab('numerical')}
        >
          <Layers size={14} />
          Numerical Distributions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'correlation' ? 'active' : ''}`}
          onClick={() => setActiveTab('correlation')}
        >
          <Grid size={14} />
          Correlation Matrix
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
          Loading dataset exploration metrics...
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              
              {/* Default Distribution */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Default Distribution</div>
                    <div className="card-subtitle">Binary loan outcome balance (loan_status)</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px 0' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>Non-Default (Fully Paid - 0)</span>
                      <span style={{ color: '#64748b' }}>23,026 loans (85.27%)</span>
                    </div>
                    <div style={{ background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: '85.27%', height: '100%', background: '#2563eb' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>Default (Charged Off - 1)</span>
                      <span style={{ color: '#64748b' }}>3,977 loans (14.73%)</span>
                    </div>
                    <div style={{ background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: '14.73%', height: '100%', background: '#dc2626' }} />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                  Target class imbalance is accounted for using balanced class weights during modeling.
                </div>
              </div>

              {/* Default by Term */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Default Rate by Loan Term</div>
                    <div className="card-subtitle">36-Month vs 60-Month comparison</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                  {edaData?.default_by_term && Object.entries(edaData.default_by_term).map(([term, stats]) => (
                    <div key={term} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{term}</span>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>
                          {(stats.default_rate * 100).toFixed(2)}% Default Rate
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {stats.total_loans.toLocaleString()} issued loans ({stats.defaults.toLocaleString()} defaults)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CATEGORICAL PATTERNS */}
          {activeTab === 'categorical' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              
              {/* Default by Grade */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Default Rate by Credit Grade</div>
                    <div className="card-subtitle">Default probability progression from Grade A to G</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  {edaData?.default_by_grade && Object.entries(edaData.default_by_grade).map(([grade, stats]) => {
                    const pct = (stats.default_rate * 100).toFixed(1);
                    return (
                      <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
                        <span style={{ width: '24px', fontWeight: 600, color: '#0f172a' }}>{grade}</span>
                        <div style={{ flex: 1, background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, stats.default_rate * 250)}%`, height: '100%', background: '#2563eb', borderRadius: '4px' }} />
                        </div>
                        <span style={{ width: '45px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Default by Home Ownership */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Default Rate by Home Ownership</div>
                    <div className="card-subtitle">Mortgage, Own, and Rent categories</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  {edaData?.default_by_home_ownership && Object.entries(edaData.default_by_home_ownership).map(([home, stats]) => (
                    <div key={home} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.84rem' }}>{home}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.84rem' }}>{(stats.default_rate * 100).toFixed(1)}%</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '6px' }}>({stats.total_loans.toLocaleString()} loans)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: NUMERICAL DISTRIBUTIONS */}
          {activeTab === 'numerical' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
              {edaData?.numerical_distributions && Object.entries(edaData.numerical_distributions).map(([feat, dist]) => (
                <div key={feat} className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title" style={{ textTransform: 'capitalize' }}>
                        {feat.replace('_', ' ')}
                      </div>
                      <div className="card-subtitle">
                        Mean: {dist.mean.toLocaleString()} • Median: {dist.median.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Non-default vs default means */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.78rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Non-Default Mean: </span>
                      <strong>{dist.non_default_mean.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Default Mean: </span>
                      <strong style={{ color: '#dc2626' }}>{dist.default_mean.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Histogram Minimal Bars */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '70px', gap: '3px', paddingTop: '6px' }}>
                    {dist.bins && dist.bins.map((b, idx) => {
                      const maxCount = Math.max(...dist.bins.map(x => x.count));
                      const heightPct = (b.count / (maxCount || 1)) * 100;
                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} title={`${b.bin_label}: ${b.count}`}>
                          <div style={{ width: '100%', height: `${Math.max(4, heightPct)}%`, background: '#2563eb', borderRadius: '1px 1px 0 0' }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                    <span>Min: {dist.min}</span>
                    <span>Max: {dist.max}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: CORRELATION MATRIX */}
          {activeTab === 'correlation' && edaData?.correlation_matrix && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Correlation Heatmap</div>
                  <div className="card-subtitle">Pearson correlation coefficients between continuous financial features</div>
                </div>
              </div>

              <div className="table-container">
                <table className="custom-table" style={{ textAlign: 'center' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Feature</th>
                      {Object.keys(edaData.correlation_matrix).map((k) => (
                        <th key={k} style={{ textTransform: 'capitalize' }}>
                          {k.replace('_', ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(edaData.correlation_matrix).map(([rowKey, rowValues]) => (
                      <tr key={rowKey}>
                        <td style={{ textAlign: 'left', fontWeight: 600, textTransform: 'capitalize' }}>
                          {rowKey.replace('_', ' ')}
                        </td>
                        {Object.entries(rowValues).map(([colKey, val]) => {
                          let bgColor = 'transparent';
                          if (val === 1.0) bgColor = '#dbeafe';
                          else if (val > 0.3) bgColor = '#fef2f2';
                          else if (val > 0.1) bgColor = '#fff7ed';
                          else if (val < -0.1) bgColor = '#f0fdf4';

                          return (
                            <td key={colKey} style={{ background: bgColor, fontWeight: Math.abs(val) > 0.3 ? 700 : 400, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EDAPage;
