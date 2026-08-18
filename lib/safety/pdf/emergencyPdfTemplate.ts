import type { EmergencyPdfData } from './emergencyPdfData';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
const clock = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const lines = (values: string[]) => `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;

export function renderEmergencyPdfHtml(data: EmergencyPdfData) {
  const incident = data.incident;
  const latest = incident?.sightings.at(-1);
  const incidentHtml = incident ? `<section class="incident"><h2>ACTIVE ELOPEMENT INFORMATION</h2>${lines([
    `Incident started: ${clock(incident.startedAt)}`, `Missing for: ${incident.missingDuration}`,
    incident.lastSeenPlaceLabel ? `Last seen: ${incident.lastSeenPlaceLabel}` : 'Last-seen place was not added.',
    `Last-seen time: ${clock(incident.lastSeenTime || incident.startedAt)}`,
    incident.currentClothing ? `Wearing: ${incident.currentClothing}` : 'Current clothing was not added.',
    latest ? `Latest reported sighting: ${latest.placeLabel} — ${clock(latest.sightingTime)}` : '',
  ].filter(Boolean))}</section>` : '';
  const sightings = incident?.sightings.length ? `<section><h2>REPORTED SIGHTINGS</h2>${incident.sightings.map((sighting, index) => `<div class="sighting"><strong>${index === incident.sightings.length - 1 ? 'LATEST REPORTED SIGHTING — ' : ''}${escapeHtml(clock(sighting.sightingTime))}</strong><br>${escapeHtml(sighting.placeLabel)}${sighting.notes ? `<br>${escapeHtml(sighting.notes)}` : ''}</div>`).join('')}</section>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{margin:34px}*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#202733;font-size:13px;line-height:1.45;margin:0}header{border-bottom:3px solid #7256B6;padding-bottom:14px;margin-bottom:18px}.brand{font-size:13px;font-weight:700;color:#7256B6}.document-title{font-size:25px;font-weight:800;margin-top:3px}.identity{display:flex;gap:18px;align-items:flex-start;margin-bottom:18px}.photo{width:128px;height:128px;object-fit:cover;border-radius:12px}.name{font-size:27px;font-weight:800;margin:0 0 5px}.age{font-size:16px;font-weight:650;color:#586271}.incident{background:#FFF3EE;border:1px solid #E6A08C;border-left:6px solid #D98770;padding:15px 17px;border-radius:10px}section{break-inside:avoid;margin:0 0 15px}h2{font-size:14px;letter-spacing:.6px;margin:0 0 7px;color:#493C62}ul{margin:0;padding-left:19px}li{margin:3px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{border:1px solid #DDE1E6;border-radius:9px;padding:13px}.sighting{border-bottom:1px solid #E3E5E8;padding:8px 0}.sighting:last-child{border-bottom:0;background:#F4F0FB;padding:9px;border-radius:7px}footer{margin-top:24px;padding-top:12px;border-top:1px solid #DDE1E6;color:#626B76;font-size:10px}
  </style></head><body><header><div class="brand">ABA at Home</div><div class="document-title">EMERGENCY CHILD SAFETY PROFILE</div></header>
  <section class="identity">${data.child.photoDataUri ? `<img class="photo" src="${data.child.photoDataUri}">` : ''}<div><h1 class="name">${escapeHtml(data.child.name)}</h1>${data.child.age ? `<div class="age">Age ${escapeHtml(data.child.age)}</div>` : ''}${data.child.identification.length ? lines(data.child.identification) : ''}</div></section>
  ${incidentHtml}<div class="grid">${data.sections.map((section) => `<section class="card"><h2>${escapeHtml(section.title)}</h2>${lines(section.lines)}</section>`).join('')}</div>${sightings}
  <footer><strong>Prepared using ABA at Home</strong><br>Information was entered by the child’s caregiver.<br>ABA at Home does not independently verify the child’s location or emergency status.</footer></body></html>`;
}
