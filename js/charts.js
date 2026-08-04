// Gráficos SVG simples e leves (sem biblioteca externa), mesmo estilo do
// protótipo já validado. Recebem dados já agregados pelas views/consultas.

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function barPath(x, y, w, h, r) {
  if (h < r * 2) r = Math.max(h / 2, 0);
  return `M${x},${y + h}L${x},${y + r}Q${x},${y} ${x + r},${y}L${x + w - r},${y}Q${x + w},${y} ${x + w},${y + r}L${x + w},${y + h}Z`;
}

// data: [{ label, value }]
export function barChart(data) {
  const W = 340, H = 210;
  const pad = { top: 28, right: 12, bottom: 32, left: 48 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.15;
  const barW = Math.min(24, (plotW / Math.max(data.length, 1)) * 0.55);
  const step = plotW / Math.max(data.length, 1);

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">`;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + plotH - (plotH * i) / 4;
    const val = (max * i) / 4;
    svg += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="var(--chart-grid)" stroke-width="1"/>`;
    svg += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--chart-muted)" font-size="10">${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)}</text>`;
  }
  svg += `<line x1="${pad.left}" y1="${pad.top + plotH}" x2="${W - pad.right}" y2="${pad.top + plotH}" stroke="var(--chart-axis)" stroke-width="1"/>`;

  data.forEach((d, i) => {
    const barH = max > 0 ? (d.value / max) * plotH : 0;
    const x = pad.left + step * i + (step - barW) / 2;
    const y = pad.top + plotH - barH;
    svg += `<path d="${barPath(x, y, barW, barH, 4)}" fill="var(--cat-1)"/>`;
    svg += `<text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" fill="var(--text-2)" font-size="10" font-weight="600">${Math.round(d.value)}</text>`;
    svg += `<text x="${x + barW / 2}" y="${pad.top + plotH + 18}" text-anchor="middle" fill="var(--chart-muted)" font-size="11">${d.label}</text>`;
  });
  svg += '</svg>';
  return svg;
}

// data: [{ label, value, color }]
export function donutChart(data, centerLabel = '') {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = 85, cy = 85, R = 72, r = 46;
  const gapDeg = total > 0 ? 2 : 0;
  const W = 280, H = 180;

  if (total === 0) {
    return `<div class="empty-action">Sem dados no período.</div>`;
  }

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">`;
  let startAngle = -90;
  data.forEach((d) => {
    if (d.value <= 0) return;
    const fullSweep = (d.value / total) * 360;
    const sweep = fullSweep - gapDeg;
    if (sweep <= 0) { startAngle += fullSweep; return; }
    const endAngle = startAngle + sweep;
    const large = sweep > 180 ? 1 : 0;
    const p1 = polar(cx, cy, R, startAngle);
    const p2 = polar(cx, cy, R, endAngle);
    const p3 = polar(cx, cy, r, endAngle);
    const p4 = polar(cx, cy, r, startAngle);
    svg += `<path d="M${p1.x.toFixed(1)},${p1.y.toFixed(1)} A${R},${R} 0 ${large} 1 ${p2.x.toFixed(1)},${p2.y.toFixed(1)} L${p3.x.toFixed(1)},${p3.y.toFixed(1)} A${r},${r} 0 ${large} 0 ${p4.x.toFixed(1)},${p4.y.toFixed(1)} Z" fill="${d.color}"/>`;
    startAngle += fullSweep;
  });

  svg += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="var(--text-1)" font-size="22" font-weight="600">${total}</text>`;
  svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--text-3)" font-size="11">${centerLabel}</text>`;

  const legendX = 180;
  data.forEach((d, i) => {
    const y = 42 + i * 42;
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0;
    svg += `<circle cx="${legendX}" cy="${y}" r="5" fill="${d.color}"/>`;
    svg += `<text x="${legendX + 14}" y="${y + 1}" fill="var(--text-1)" font-size="13" font-weight="500" dominant-baseline="middle">${escXml(d.label)}</text>`;
    svg += `<text x="${legendX + 14}" y="${y + 17}" fill="var(--text-3)" font-size="11">${d.value} un (${pct}%)</text>`;
  });
  svg += '</svg>';
  return svg;
}

// data: [{ name, value }] (already sorted desc)
export function rankingChart(data) {
  if (!data.length) return `<div class="empty-action">Sem vendas no período.</div>`;
  const max = Math.max(...data.map((d) => d.value));
  const barH = 14, rowH = 46, labelW = 110;
  const W = 340, H = data.length * rowH + 8;
  const barArea = W - labelW - 80;

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">`;
  data.forEach((d, i) => {
    const y = 8 + i * rowH;
    const bw = max > 0 ? (d.value / max) * barArea : 0;
    svg += `<text x="${labelW - 8}" y="${y + barH / 2 + 5}" text-anchor="end" fill="var(--text-1)" font-size="13" font-weight="500">${escXml(d.name)}</text>`;
    svg += `<path d="${barPath(labelW, y + 2, bw, barH, 4)}" fill="var(--cat-1)"/>`;
    svg += `<text x="${labelW + bw + 8}" y="${y + barH / 2 + 5}" fill="var(--text-2)" font-size="12" font-weight="600">${fmtMoedaLocal(d.value)}</text>`;
  });
  svg += '</svg>';
  return svg;
}

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtMoedaLocal(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
