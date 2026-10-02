import React from 'react';

const RiskGauge = ({ probability = 0, riskCategory = 'Low' }) => {
  const percentage = (probability * 100).toFixed(1);
  
  let statusColor = '#16a34a'; // Success green
  let statusBg = '#f0fdf4';
  let statusBorder = '#bbf7d0';
  let badgeText = 'LOW RISK';

  if (riskCategory.toLowerCase() === 'medium') {
    statusColor = '#d97706'; // Amber
    statusBg = '#fffbeb';
    statusBorder = '#fde68a';
    badgeText = 'MEDIUM RISK';
  } else if (riskCategory.toLowerCase() === 'high') {
    statusColor = '#dc2626'; // Danger red
    statusBg = '#fef2f2';
    statusBorder = '#fecaca';
    badgeText = 'HIGH RISK';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Default Probability
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {percentage}%
          </div>
        </div>

        <span 
          style={{ 
            background: statusBg, 
            color: statusColor, 
            border: `1px solid ${statusBorder}`,
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.04em'
          }}
        >
          {badgeText}
        </span>
      </div>

      {/* Segmented Risk Threshold Bar */}
      <div>
        <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${Math.min(100, Math.max(0, probability * 100))}%`, 
              height: '100%', 
              background: statusColor, 
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} 
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
          <span>0% (Low Risk &lt;30%)</span>
          <span>30% (Medium 30-60%)</span>
          <span>60% (High &gt;60%) 100%</span>
        </div>
      </div>
    </div>
  );
};

export default RiskGauge;
