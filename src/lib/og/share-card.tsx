type ShareCardProps = {
  title: string;
  subtitle: string;
  kindLabel: string;
};

export const shareCardSize = {
  width: 1200,
  height: 630,
} as const;

export function ShareCard({ title, subtitle, kindLabel }: ShareCardProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, #0f172a 0%, #111827 40%, #1e293b 100%)',
        color: '#f8fafc',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at top right, rgba(59,130,246,0.28), transparent 34%), radial-gradient(circle at left center, rgba(16,185,129,0.18), transparent 30%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: '42px',
          borderRadius: '40px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(18px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '44px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #2563eb, #22c55e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 18px 40px rgba(37,99,235,0.35)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                border: '3px solid rgba(255,255,255,0.95)',
                borderTop: 'none',
                borderLeftWidth: '4px',
                transform: 'skewY(-4deg)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Arsip Belajar
            </div>
            <div style={{ fontSize: '16px', color: 'rgba(226,232,240,0.78)' }}>
              {kindLabel}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.05em',
              maxWidth: '960px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(226,232,240,0.78)',
              maxWidth: '920px',
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}
