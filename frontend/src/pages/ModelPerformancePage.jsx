import React, { useEffect, useState } from 'react';
import { 
  Trophy, CheckCircle2, BarChart3, Layers, 
  Award, ArrowRight
} from 'lucide-react';
import { getModelMetrics } from '../services/api';

const ModelPerformancePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModelName, setSelectedModelName] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const res = await getModelMetrics();
        setData(res);
        if (res.models && res.models.length > 0) {
          const best = res.models.find(m => m.model_name === res.best_model_by_auc) || res.models[0];
          setSelectedModelName(best.model_name);
        }
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const selectedModel = data?.models?.find(m => m.model_name === selectedModelName) || data?.models?.[0];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-block">
        <h1 className="page-main-title">Model Performance</h1>
        <p className="page-main-subtitle">Cross-model validation benchmarks on the stratified 20% holdout test set (5,401 validation loans).</p>
      </div>

      {/* Benchmark Table Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Candidate Model Comparison</div>
            <div className="card-subtitle">Real test performance evaluated across classifiers</div>
          </div>
          <span className="badge-risk badge-risk-low" style={{ textTransform: 'none', fontSize: '0.74rem' }}>
            Production Model: {data?.best_model_by_auc || 'Logistic Regression'}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>
            Loading model evaluation benchmarks...
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Model Architecture</th>
                  <th>ROC-AUC</th>
                  <th>PR-AUC</th>
                  <th>F1-Score</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>Accuracy</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.models?.map((m) => {
                  const isBest = m.model_name === data.best_model_by_auc;
                  const isSelected = m.model_name === selectedModelName;

                  return (
                    <tr 
                      key={m.model_name}
                      style={{ 
                        background: isSelected ? '#eff6ff' : 'transparent',
                        fontWeight: isSelected ? 600 : 400
                      }}
                    >
                      <td style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {m.model_name}
                        {isBest && (
                          <span style={{ fontSize: '0.68rem', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Production
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#2563eb', fontWeight: 700 }}>
                        {(m.roc_auc * 100).toFixed(2)}%
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {(m.pr_auc * 100).toFixed(2)}%
                      </td>
                      <td>{(m.f1_score * 100).toFixed(1)}%</td>
                      <td>{(m.precision * 100).toFixed(1)}%</td>
                      <td>{(m.recall * 100).toFixed(1)}%</td>
                      <td>{(m.accuracy * 100).toFixed(1)}%</td>
                      <td>
                        <span className="badge-risk badge-neutral" style={{ textTransform: 'capitalize' }}>
                          {m.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                          onClick={() => setSelectedModelName(m.model_name)}
                        >
                          {isSelected ? 'Viewing' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Model Deep Dive */}
      {selectedModel && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          
          {/* Confusion Matrix Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">
                  Confusion Matrix ({selectedModel.model_name})
                </div>
                <div className="card-subtitle">Predicted vs actual loan defaults on holdout set</div>
              </div>
            </div>

            {selectedModel.confusion_matrix && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>True Negatives (TN)</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#16a34a' }}>
                    {selectedModel.confusion_matrix[0][0].toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Correct non-default predictions</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>False Positives (FP)</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#d97706' }}>
                    {selectedModel.confusion_matrix[0][1].toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Type I error (False alarm)</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>False Negatives (FN)</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#dc2626' }}>
                    {selectedModel.confusion_matrix[1][0].toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Type II error (Missed default)</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>True Positives (TP)</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#2563eb' }}>
                    {selectedModel.confusion_matrix[1][1].toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Correct default detections</div>
                </div>
              </div>
            )}
          </div>

          {/* Feature Importances Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">
                  Feature Importance ({selectedModel.model_name})
                </div>
                <div className="card-subtitle">Global predictive weight assigned by the model</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {selectedModel.feature_importances && Object.entries(selectedModel.feature_importances).slice(0, 7).map(([feat, imp]) => {
                const maxImp = Math.max(...Object.values(selectedModel.feature_importances)) || 1;
                const widthPct = (imp / maxImp) * 100;

                return (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
                    <span style={{ width: '130px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {feat.replace('_', ' ')}
                    </span>
                    <div style={{ flex: 1, background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${widthPct}%`, 
                          height: '100%', 
                          background: '#2563eb', 
                          borderRadius: '4px' 
                        }} 
                      />
                    </div>
                    <span style={{ width: '45px', textAlign: 'right', fontSize: '0.76rem', color: '#64748b', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                      {imp.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ModelPerformancePage;
