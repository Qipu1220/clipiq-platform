import { useState } from 'react';

interface WarningBannerProps {
  warnings: number;
  username: string;
}

export function WarningBanner({ warnings, username }: WarningBannerProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (warnings === 0) return null;

  const getAccentColor = () => {
    if (warnings >= 3) return '#ef4444'; // red-500
    if (warnings >= 2) return '#f97316'; // orange-500
    return '#eab308'; // yellow-500
  };

  const getSeverityText = () => {
    if (warnings >= 3) return 'Cảnh báo nghiêm trọng';
    if (warnings >= 2) return 'Cảnh báo cao';
    return 'Cảnh báo';
  };

  const getWarningMessage = () => {
    if (warnings >= 3) {
      return 'Tài khoản của bạn có nguy cơ bị cấm cao. Vui lòng tuân thủ quy định cộng đồng.';
    }
    if (warnings >= 2) {
      return 'Bạn đã vi phạm quy định nhiều lần. Tiếp tục vi phạm có thể dẫn đến cấm tài khoản.';
    }
    return 'Bạn đã nhận cảnh báo. Vui lòng tuân thủ quy định cộng đồng.';
  };

  if (isMinimized) {
    return (
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <button
          onClick={() => setIsMinimized(false)}
          style={{
            background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.95) 0%, rgba(39, 39, 42, 0.95) 100%)',
            backdropFilter: 'blur(12px)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '12px',
            border: `1px solid ${getAccentColor()}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: `0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px ${getAccentColor()}30`,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px ${getAccentColor()}50`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px ${getAccentColor()}30`;
          }}
        >
          <span style={{ fontSize: '16px', filter: 'drop-shadow(0 0 4px currentColor)', color: getAccentColor() }}>⚠</span>
          <span style={{ color: '#e4e4e7' }}>{warnings} cảnh báo</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', maxWidth: '380px', zIndex: 9999 }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.98) 0%, rgba(39, 39, 42, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        border: `1px solid ${getAccentColor()}40`,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `${getAccentColor()}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${getAccentColor()}30`
            }}>
              <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 6px currentColor)', color: getAccentColor() }}>⚠</span>
            </div>
            <div>
              <h3 style={{ color: '#fafafa', fontWeight: '600', fontSize: '15px', margin: 0, letterSpacing: '-0.01em' }}>
                {getSeverityText()}
              </h3>
              <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '2px 0 0 0', fontWeight: '400' }}>
                @{username}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              color: '#71717a',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '6px 8px',
              fontSize: '12px',
              transition: 'all 0.2s ease',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#a1a1aa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#71717a';
            }}
            title="Thu nhỏ"
          >
            Thu nhỏ
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Warning count badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{
              background: `${getAccentColor()}10`,
              borderRadius: '12px',
              padding: '10px 20px',
              border: `1px solid ${getAccentColor()}25`,
              boxShadow: `0 0 20px ${getAccentColor()}15`
            }}>
              <span style={{
                color: getAccentColor(),
                fontWeight: '700',
                fontSize: '22px',
                letterSpacing: '-0.02em'
              }}>
                {warnings}
              </span>
              <span style={{
                color: '#d4d4d8',
                fontWeight: '500',
                fontSize: '15px',
                marginLeft: '8px'
              }}>
                cảnh báo
              </span>
            </div>
          </div>

          {/* Message */}
          <p style={{
            color: '#e4e4e7',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '20px',
            lineHeight: '1.6',
            fontWeight: '400'
          }}>
            {getWarningMessage()}
          </p>

          {/* Progress bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#a1a1aa',
              marginBottom: '8px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <span>Mức độ</span>
              <span style={{ color: getAccentColor(), fontWeight: '600' }}>{warnings}/3</span>
            </div>
            <div style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '6px',
              height: '6px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div
                style={{
                  background: `linear-gradient(90deg, ${getAccentColor()} 0%, ${getAccentColor()}90 100%)`,
                  height: '100%',
                  borderRadius: '6px',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: `${Math.min((warnings / 3) * 100, 100)}%`,
                  boxShadow: `0 0 12px ${getAccentColor()}60`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
