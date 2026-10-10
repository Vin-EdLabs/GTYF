/**
 * Draws the "impact receipt" as a 1080×1350 image (Instagram portrait / WhatsApp
 * status) with the Canvas API: an exercise-book page with blue ruling, red
 * margin, the lantern mark and the donor's impact. No libraries needed.
 */
import { formatCedis, formatDate } from '@gtyf/shared';
import type { DonationReceipt } from '@gtyf/shared/donations';

const W = 1080;
const H = 1350;
const INK = '#0B1422';
const LANTERN = '#F2A900';
const SLATE = '#5B6676';
const MIST = '#F3F5F8';
const DISPLAY = '"Bricolage Grotesque Variable", system-ui, sans-serif';
const BODY = '"Figtree Variable", system-ui, sans-serif';
const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawImpactImage(r: DonationReceipt, orgName: string, siteHost: string): Promise<Blob> {
  // Make sure the brand fonts are ready before drawing text.
  await Promise.all([
    document.fonts.load(`800 80px ${DISPLAY}`),
    document.fonts.load(`600 36px ${BODY}`),
    document.fonts.load(`500 24px ${MONO}`),
  ]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background + soft lantern glow
  ctx.fillStyle = MIST;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, 120, 10, W * 0.8, 120, 600);
  glow.addColorStop(0, 'rgba(242,169,0,0.22)');
  glow.addColorStop(1, 'rgba(242,169,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // The page
  const px = 70;
  const py = 150;
  const pw = W - px * 2;
  const ph = H - py - 170;
  ctx.save();
  ctx.shadowColor = 'rgba(11,20,34,0.16)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 36);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 36);
  ctx.clip();
  const gap = 76;
  ctx.strokeStyle = 'rgba(61,111,214,0.2)';
  ctx.lineWidth = 2;
  for (let y = py + 110; y < py + ph; y += gap) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px + pw, y);
    ctx.stroke();
  }
  const marginX = px + 120;
  ctx.strokeStyle = 'rgba(214,69,61,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(marginX, py);
  ctx.lineTo(marginX, py + ph);
  ctx.stroke();
  ctx.restore();

  // Header: lantern mark + org name
  ctx.fillStyle = LANTERN;
  ctx.beginPath();
  ctx.arc(px + 22, 78, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `700 36px ${DISPLAY}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(orgName, px + 64, 80);

  // Stamp in the page corner
  ctx.strokeStyle = 'rgba(242,169,0,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px + pw - 90, py + 90, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = LANTERN;
  ctx.beginPath();
  ctx.arc(px + pw - 90, py + 90, 22, 0, Math.PI * 2);
  ctx.fill();

  // Body text sits on the ruled lines, right of the margin
  const tx = marginX + 40;
  const tw = px + pw - tx - 60;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = SLATE;
  ctx.font = `500 28px ${MONO}`;
  ctx.fillText(r.frequency === 'monthly' ? 'I GIVE EVERY MONTH' : 'I JUST GAVE', tx, py + 110 + gap - 20);

  ctx.fillStyle = INK;
  const amountText = `${formatCedis(r.amount)}${r.frequency === 'monthly' ? '/mo' : ''}`;
  // Shrink the amount until it fits beside the margin (big gifts have long numbers).
  let amountSize = 128;
  do {
    ctx.font = `800 ${amountSize}px ${DISPLAY}`;
  } while (ctx.measureText(amountText).width > tw - 90 && (amountSize -= 6) > 60);
  ctx.fillText(amountText, tx, py + 110 + gap * 3 - 16);

  // Impact line, e.g. "1 full school uniform + 1 pair of shoes"
  const impact = (r.impactSummary ?? '').replace(/^.*?=\s*/, '') || `support for ${r.causeName}`;
  ctx.font = `700 64px ${DISPLAY}`;
  const lines = wrap(ctx, impact, tw).slice(0, 5);
  let y = py + 110 + gap * 5 - 16;
  for (const line of lines) {
    ctx.fillText(line, tx, y);
    y += gap;
  }

  ctx.fillStyle = SLATE;
  ctx.font = `600 34px ${BODY}`;
  for (const line of wrap(ctx, `for ${r.causeName}`, tw).slice(0, 2)) {
    ctx.fillText(line, tx, y);
    y += gap;
  }
  ctx.font = `500 22px ${MONO}`;
  ctx.fillText((r.paidAt ? formatDate(r.paidAt) : '').toUpperCase(), tx, py + ph - 50);

  // Hand-drawn lantern underline under the amount
  ctx.strokeStyle = LANTERN;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.font = `800 ${amountSize}px ${DISPLAY}`;
  const underlineW = Math.min(ctx.measureText(amountText).width, tw);
  const uy = py + 110 + gap * 3 + 14;
  ctx.beginPath();
  ctx.moveTo(tx, uy);
  ctx.bezierCurveTo(tx + underlineW * 0.3, uy - 10, tx + underlineW * 0.7, uy - 8, tx + underlineW, uy - 2);
  ctx.stroke();

  // Footer call to action
  ctx.fillStyle = INK;
  ctx.font = `700 38px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.fillText('Every child deserves a guide.', W / 2, H - 92);
  ctx.fillStyle = SLATE;
  ctx.font = `500 26px ${MONO}`;
  ctx.fillText(`${siteHost}/donate`.toUpperCase(), W / 2, H - 46);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));
}

/**
 * Share via the phone's share sheet (WhatsApp status, Instagram…) when the
 * browser can share files; otherwise download the PNG.
 */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
