/* eslint-disable @next/next/no-img-element */
type ShareCardProps = {
  title: string;
  subtitle: string;
  kindLabel: string;
  imageSrc?: string | null;
  brandLogoSrc?: string | null;
};

export const shareCardSize = {
  width: 1200,
  height: 630,
} as const;

export function ShareCard({ title, subtitle, kindLabel, imageSrc, brandLogoSrc }: ShareCardProps) {
  const resolvedBrandLogoSrc = brandLogoSrc ?? imageSrc;

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
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 18px 40px rgba(37,99,235,0.18)',
              flexShrink: 0,
            }}
          >
            {resolvedBrandLogoSrc ? (
              <img
                src={resolvedBrandLogoSrc}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : null}
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

        <div style={{ display: 'flex', gap: '28px', alignItems: 'stretch', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '16px',
              width: imageSrc ? '58%' : '100%',
              paddingRight: imageSrc ? '6px' : '0',
            }}
          >
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

          <div
            style={{
              display: 'flex',
              width: '42%',
              minWidth: '360px',
              borderRadius: '32px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(15, 23, 42, 0.85)',
              boxShadow: '0 24px 80px rgba(15,23,42,0.45)',
              position: 'relative',
            }}
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  }}
                />
              ) : null}
            {!imageSrc ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '24px',
                textAlign: 'center',
                background:
                  'linear-gradient(135deg, rgba(37,99,235,0.26), rgba(34,197,94,0.18))',
              }}
              >
                <div style={{ fontSize: '22px', fontWeight: 800 }}>Foto preview</div>
                <div style={{ fontSize: '18px', color: 'rgba(226,232,240,0.82)', lineHeight: 1.4 }}>
                  Taruh logo di <span style={{ fontWeight: 700 }}>/public/logo.jpg</span>
                </div>
              </div>
            ) : null}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.26) 100%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
