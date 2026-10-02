import React, { useEffect, useState } from 'react';
import { 
  History, Search, RefreshCw, Eye, X, 
  ArrowRight, ShieldCheck, FileText, CheckCircle2
} from 'lucide-react';
import { getPredictions, getPredictionById } from '../services/api';
import RiskGauge from '../components/RiskGauge';

const PredictionHistoryPage = ({ selectedIdFromNav, onNavigateToPredict }) => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getPredictions(100, 0);
      setPredictions(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (selectedIdFromNav) {
      handleViewDetail(selectedIdFromNav);
    }
  }, [selectedIdFromNav]);

  const handleViewDetail = async (id) => {
    try {
      setDetailLoading(true);
      const detail = await getPredictionById(id);
      setSelectedPrediction(detail);
    } catch (err) {
      console.error('Failed to load detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredPredictions = predictions.filter(p => {
    const matchesSearch = 
      p.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prediction_id.toString().includes(searchTerm) ||
      (p.purpose && p.purpose.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRisk = riskFilter === 'ALL' || p.risk_category?.toUpperCase() === riskFilter.toUpperCase();

    return matchesSearch && matchesRisk;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-block">
        <h1 className="page-main-title">Prediction History</h1>
        <p className="page-main-subtitle">Search and audit historical credit risk assessments and decisions.</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '260px', flex: 1, maxWidth: '420px' }}>
            <Search size={15} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search by applicant name, ID, or purpose..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#0f172a', outline: 'none', width: '100%', fontSize: '0.84rem' }}
            />
          </div>

          {/* Filter Badges & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Filter Risk:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((risk) => (
                <button 
                  key={risk}
                  className={`btn btn-sm ${riskFilter === risk ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  onClick={() => setRiskFilter(risk)}
                >
                  {risk}
                </button>
              ))}
            </div>

            <button 
              className="btn btn-secondary btn-sm" 
              style={{ padding: '5px 8px' }}
              onClick={fetchHistory}
              title="Refresh ledger"
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
            </button>
          </div>

        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Historical Assessment Records</div>
            <div className="card-subtitle">
              Showing {filteredPredictions.length} of {predictions.length} recorded predictions
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
            Loading prediction history records...
          </div>
        ) : filteredPredictions.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Applicant</th>
                  <th>Loan Amount</th>
                  <th>Default Probability</th>
                  <th>Risk Category</th>
                  <th>Model Used</th>
                  <th>Prediction Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPredictions.map((item) => {
                  let badgeClass = 'badge-risk-low';
                  if (item.risk_category?.toLowerCase() === 'medium') badgeClass = 'badge-risk-med';
                  if (item.risk_category?.toLowerCase() === 'high') badgeClass = 'badge-risk-high';

                  const dateStr = new Date(item.prediction_time).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr key={item.prediction_id}>
                      <td className="font-mono" style={{ color: '#2563eb', fontWeight: 600 }}>
                        #{item.prediction_id}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.applicant_name}</td>
                      <td>${item.loan_amount?.toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>
                        {(item.default_probability * 100).toFixed(1)}%
                      </td>
                      <td>
                        <span className={`badge-risk ${badgeClass}`}>
                          {item.risk_category}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.model_name}</td>
                      <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{dateStr}</td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                          onClick={() => handleViewDetail(item.prediction_id)}
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
          /* Empty State Section 24 */
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#64748b' }}>
              <FileText size={20} />
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              No predictions yet
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '16px' }}>
              Run your first loan risk assessment to see results here.
            </p>
            {onNavigateToPredict && (
              <button className="btn btn-primary btn-sm" onClick={onNavigateToPredict}>
                Assess Loan Risk
              </button>
            )}
          </div>
        )}
      </div>

      {/* Prediction Detail Modal */}
      {selectedPrediction && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '780px', width: '100%', maxHeight: '85vh', overflowY: 'auto', background: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            
            <div className="card-header" style={{ paddingBottom: '12px' }}>
              <div>
                <div className="card-title" style={{ fontSize: '1.1rem' }}>
                  Risk Assessment #{selectedPrediction.prediction_id}
                </div>
                <div className="card-subtitle">
                  Applicant: {selectedPrediction.applicant?.name} • Evaluated {new Date(selectedPrediction.prediction_time).toLocaleString()}
                </div>
              </div>

              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '4px 6px' }}
                onClick={() => setSelectedPrediction(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
              
              {/* Risk Gauge Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <RiskGauge 
                  probability={selectedPrediction.default_probability} 
                  riskCategory={selectedPrediction.risk_category} 
                />
                <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#64748b' }}>
                  Evaluated with {selectedPrediction.model_name}
                </div>
              </div>

              {/* Attributes Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Loan Parameters</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.82rem' }}>
                    <div>Amount: <strong>${selectedPrediction.loan?.loan_amount?.toLocaleString()}</strong></div>
                    <div>Term: <strong>{selectedPrediction.loan?.loan_term} mos</strong></div>
                    <div>Rate: <strong>{selectedPrediction.loan?.interest_rate}%</strong></div>
                    <div>Grade: <strong>{selectedPrediction.loan?.grade}</strong></div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Applicant Profile</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.82rem' }}>
                    <div>Annual Income: <strong>${selectedPrediction.applicant?.income?.toLocaleString()}</strong></div>
                    <div>DTI: <strong>{selectedPrediction.loan?.dti}%</strong></div>
                    <div>Tenure: <strong>{selectedPrediction.applicant?.employment_type}</strong></div>
                    <div>Credit Score: <strong>{selectedPrediction.applicant?.credit_score}</strong></div>
                  </div>
                </div>
              </div>

            </div>

            {/* Historical SHAP Breakdown */}
            {selectedPrediction.shap_summary && (
              <div style={{ marginTop: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                  SHAP Decision Attribution Summary
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                  {selectedPrediction.shap_summary.summary_text}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default PredictionHistoryPage;
