export function Skeleton({ width = "100%", height = "20px", borderRadius = "6px", style = {} }) {
  return (
    <div
      className="pff-skeleton-pulse"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonTable({ rows = 6, columns = 5 }) {
  return (
    <div className="pff-skeleton-table-wrapper">
      <div className="pff-skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={`${60 + (i % 3) * 15}%`} height="18px" />
        ))}
      </div>
      <div className="pff-skeleton-table-body">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="pff-skeleton-table-row">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                width={c === 0 ? "40%" : c === columns - 1 ? "80px" : `${70 + (c % 2) * 20}%`}
                height="16px"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPlanCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
      {[1, 2].map((i) => (
        <div key={i} className="pff-card" style={{ padding: "24px" }}>
          <Skeleton width="40%" height="28px" style={{ marginBottom: "16px" }} />
          <Skeleton width="60%" height="36px" style={{ marginBottom: "12px" }} />
          <Skeleton width="80%" height="16px" style={{ marginBottom: "24px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
            <Skeleton width="90%" height="16px" />
            <Skeleton width="85%" height="16px" />
            <Skeleton width="75%" height="16px" />
          </div>
          <Skeleton width="100%" height="42px" borderRadius="8px" />
        </div>
      ))}
    </div>
  );
}
