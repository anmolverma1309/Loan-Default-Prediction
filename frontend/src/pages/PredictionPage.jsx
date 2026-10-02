import React, { useState } from 'react';
import { 
  Send, CheckCircle2, AlertTriangle, AlertCircle, 
  HelpCircle, ArrowUp, ArrowDown, RefreshCw, FileText
} from 'lucide-react';
import RiskGauge from '../components/RiskGauge';
import { predictAndExplain } from '../services/api';

const PRESET_PROFILES = {
  safe: {
    name: "Dr. Evelyn Reed (Prime Borrower)",
    annual_inc: 125000,
    emp_length: "10+ years",
    home_ownership: "MORTGAGE",
    verification_status: "Verified",
    loan_amnt: 12000,
    term: 36,
    int_rate: 7.9,
    purpose: "credit_card",
    grade: "A",
    sub_grade: "A2",
    dti: 8.5,
    delinq_2yrs: 0,
    inq_last_6mths: 0,
    open_acc: 12,
    pub_rec: 0,
    revol_bal: 4200,
    revol_util: 18.5,
    total_acc: 26,
    pub_rec_bankruptcies: 0
  },
  moderate: {
    name: "Marcus Vance (Moderate Risk)",
    annual_inc: 54000,
    emp_length: "4 years",
    home_ownership: "RENT",
    verification_status: "Source Verified",
    loan_amnt: 16000,
    term: 36,
    int_rate: 14.2,
    purpose: "debt_consolidation",
    grade: "C",
    sub_grade: "C3",
    dti: 17.5,
    delinq_2yrs: 0,
    inq_last_6mths: 1,
    open_acc: 8,
    pub_rec: 0,
    revol_bal: 11500,
    revol_util: 56.0,
    total_acc: 15,
    pub_rec_bankruptcies: 0
  },
  highRisk: {
    name: "Jordan Hayes (High Risk Applicant)",
    annual_inc: 28000,
    emp_length: "< 1 year",
    home_ownership: "RENT",
    verification_status: "Not Verified",
    loan_amnt: 25000,
    term: 60,
    int_rate: 22.8,
    purpose: "small_business",
    grade: "F",
    sub_grade: "F4",
    dti: 29.4,
    delinq_2yrs: 2,
    inq_last_6mths: 3,
    open_acc: 6,
    pub_rec: 1,
    revol_bal: 19800,
    revol_util: 89.0,
    total_acc: 10,
    pub_rec_bankruptcies: 1
  }
};

const PredictionPage = () => {
  const [formData, setFormData] = useState(PRESET_PROFILES.moderate);
  const [modelOverride, setModelOverride] = useState('XGBoost');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const applyPreset = (presetKey) => {
    setFormData(PRESET_PROFILES[presetKey]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        model_override: modelOverride
      };
      const response = await predictAndExplain(payload);
      setResult(response);
    } catch (err) {
      console.error('Prediction failed:', err);
      setError('Unable to generate prediction. Please verify the entered information and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-block">
        <h1 className="page-main-title">Loan Risk Assessment</h1>
        <p className="page-main-subtitle">Enter applicant and loan information to estimate default risk.</p>
      </div>

      {/* Preset Profiles Selector Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
            Quick Applicant Profiles:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="preset-pill" 
              onClick={() => applyPreset('safe')}
            >
              Prime (A-Grade)
            </button>
            <button 
              type="button" 
              className="preset-pill" 
              onClick={() => applyPreset('moderate')}
            >
              Moderate (C-Grade)
            </button>
            <button 
              type="button" 
              className="preset-pill" 
              onClick={() => applyPreset('highRisk')}
            >
              High Risk (F-Grade)
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1.1fr 0.9fr' : '1fr', gap: '24px' }}>
        
        {/* Left Column: Form */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            
            {/* Section 1: Applicant Information */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                Applicant Information
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Applicant Name</label>
                  <input 
                    type="text" 
                    name="name"
                    className="form-input" 
                    placeholder="e.g. John Doe"
                    value={formData.name || ''} 
                    onChange={handleInputChange} 
                    required 
                  />
                  <span className="form-helper-text">Full legal name of the borrower</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Annual Income ($)</label>
                  <input 
                    type="number" 
                    name="annual_inc"
                    className="form-input" 
                    placeholder="e.g. 60000"
                    value={formData.annual_inc} 
                    onChange={handleInputChange} 
                    min="1000" 
                    step="1000"
                    required 
                  />
                  <span className="form-helper-text">Verified total yearly gross income</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Employment Length</label>
                  <select 
                    name="emp_length" 
                    className="form-select" 
                    value={formData.emp_length} 
                    onChange={handleInputChange}
                  >
                    <option value="< 1 year">&lt; 1 year</option>
                    <option value="1 year">1 year</option>
                    <option value="2 years">2 years</option>
                    <option value="3 years">3 years</option>
                    <option value="5 years">5 years</option>
                    <option value="7 years">7 years</option>
                    <option value="10+ years">10+ years</option>
                  </select>
                  <span className="form-helper-text">Continuous employment tenure</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Home Ownership</label>
                  <select 
                    name="home_ownership" 
                    className="form-select" 
                    value={formData.home_ownership} 
                    onChange={handleInputChange}
                  >
                    <option value="RENT">RENT</option>
                    <option value="MORTGAGE">MORTGAGE</option>
                    <option value="OWN">OWN</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                  <span className="form-helper-text">Residential ownership status</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Verification Status</label>
                  <select 
                    name="verification_status" 
                    className="form-select" 
                    value={formData.verification_status} 
                    onChange={handleInputChange}
                  >
                    <option value="Verified">Verified</option>
                    <option value="Source Verified">Source Verified</option>
                    <option value="Not Verified">Not Verified</option>
                  </select>
                  <span className="form-helper-text">Income documentation check</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Debt-to-Income (DTI %)</label>
                  <input 
                    type="number" 
                    name="dti"
                    className="form-input" 
                    placeholder="e.g. 15.2"
                    value={formData.dti} 
                    onChange={handleInputChange} 
                    min="0" 
                    max="100" 
                    step="0.1" 
                    required 
                  />
                  <span className="form-helper-text">Monthly debt payments divided by income</span>
                </div>
              </div>
            </div>

            {/* Section 2: Loan Information */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                Loan Information
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Requested Loan Amount ($)</label>
                  <input 
                    type="number" 
                    name="loan_amnt"
                    className="form-input" 
                    placeholder="e.g. 15000"
                    value={formData.loan_amnt} 
                    onChange={handleInputChange} 
                    min="500" 
                    step="500" 
                    required 
                  />
                  <span className="form-helper-text">Principal requested</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Loan Term</label>
                  <select 
                    name="term" 
                    className="form-select" 
                    value={formData.term} 
                    onChange={handleInputChange}
                  >
                    <option value={36}>36 Months (3 Years)</option>
                    <option value={60}>60 Months (5 Years)</option>
                  </select>
                  <span className="form-helper-text">Repayment duration</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Interest Rate (%)</label>
                  <input 
                    type="number" 
                    name="int_rate"
                    className="form-input" 
                    placeholder="e.g. 12.5"
                    value={formData.int_rate} 
                    onChange={handleInputChange} 
                    min="1" 
                    max="40" 
                    step="0.01" 
                    required 
                  />
                  <span className="form-helper-text">Annual percentage rate</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Credit Grade</label>
                  <select 
                    name="grade" 
                    className="form-select" 
                    value={formData.grade} 
                    onChange={handleInputChange}
                  >
                    <option value="A">Grade A (Lowest Risk)</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                    <option value="D">Grade D</option>
                    <option value="E">Grade E</option>
                    <option value="F">Grade F</option>
                    <option value="G">Grade G (Highest Risk)</option>
                  </select>
                  <span className="form-helper-text">Assigned credit tier</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Loan Purpose</label>
                  <select 
                    name="purpose" 
                    className="form-select" 
                    value={formData.purpose} 
                    onChange={handleInputChange}
                  >
                    <option value="debt_consolidation">Debt Consolidation</option>
                    <option value="credit_card">Credit Card Refinancing</option>
                    <option value="home_improvement">Home Improvement</option>
                    <option value="small_business">Small Business</option>
                    <option value="major_purchase">Major Purchase</option>
                    <option value="medical">Medical Expenses</option>
                    <option value="other">Other</option>
                  </select>
                  <span className="form-helper-text">Primary usage of funds</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Model Engine</label>
                  <select 
                    className="form-select" 
                    value={modelOverride}
                    onChange={(e) => setModelOverride(e.target.value)}
                  >
                    <option value="XGBoost">XGBoost (Production Champion)</option>
                    <option value="Random Forest">Random Forest (Tree Ensemble)</option>
                    <option value="Logistic Regression">Logistic Regression (Baseline)</option>
                  </select>
                  <span className="form-helper-text">Classifier architecture</span>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 14px', color: '#b91c1c', fontSize: '0.82rem', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '11px', fontSize: '0.92rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  Assessing Risk...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Assess Loan Risk
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Result Panel & SHAP Explainability */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Risk Assessment Result Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Risk Assessment</div>
                  <div className="card-subtitle">
                    Model: {result.prediction.model} v{result.prediction.model_version} • ID #{result.prediction.prediction_id}
                  </div>
                </div>
              </div>

              <div style={{ padding: '8px 0 16px' }}>
                <RiskGauge 
                  probability={result.prediction.default_probability} 
                  riskCategory={result.prediction.risk_category} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '0.78rem', color: '#64748b' }}>
                <span>Model Confidence: <strong>{(result.prediction.confidence_score * 100).toFixed(1)}%</strong></span>
                <span>Audit Timestamp: {new Date(result.prediction.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Explainability Section */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Why this prediction?</div>
                  <div className="card-subtitle">Key factors influencing the model's prediction.</div>
                </div>
              </div>

              {/* Natural Language Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', fontSize: '0.84rem', color: '#334155', marginBottom: '16px', lineHeight: 1.5 }}>
                {result.summary_text}
              </div>

              {/* Horizontal Contribution Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Top Feature Contributions (SHAP)
                </div>

                {result.all_contributions?.slice(0, 6).map((item, idx) => {
                  const isPositive = item.contribution > 0;
                  const absVal = Math.abs(item.contribution);
                  const maxImpact = Math.max(...result.all_contributions.map(x => Math.abs(x.contribution))) || 0.1;
                  const barWidth = Math.min(100, (absVal / maxImpact) * 100);

                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
                      <span style={{ width: '130px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.feature_label}
                      </span>

                      <div style={{ flex: 1, background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                        <div 
                          style={{ 
                            width: `${barWidth}%`, 
                            height: '100%', 
                            background: isPositive ? '#dc2626' : '#16a34a',
                            borderRadius: '5px' 
                          }} 
                        />
                      </div>

                      <span style={{ width: '55px', textAlign: 'right', fontWeight: 600, color: isPositive ? '#dc2626' : '#16a34a', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
                        {isPositive ? `+${absVal.toFixed(3)}` : `-${absVal.toFixed(3)}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '14px', fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                Red indicates increased default risk; Green indicates mitigating/protective factors.
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default PredictionPage;
