// FitGesty Admin - Módulo de Gestão de Leads Qualificados
async function updateLeadStatus(id, status) {
  try {
    await req(`/api/leads/${id}`, 'PUT', { status });
    showToast('Status do lead atualizado!');
  } catch (err) {
    showToast(err.message || 'Erro ao atualizar lead.', 'error');
  }
}

async function loadLeads() {
  const token = localStorage.getItem('fit_token');
  const metricLeads = document.getElementById('metric-leads');
  const tableBody = document.getElementById('tableLeads');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/leads', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-muted">Acesso restrito ao perfil de Administrador.</td></tr>';
      }
      return;
    }

    const leads = await res.json();
    if (metricLeads) metricLeads.textContent = leads.length;

    const metricTotalLeads = document.getElementById('metric-total-leads');
    if (metricTotalLeads) {
      metricTotalLeads.textContent = `${leads.length} ${leads.length === 1 ? 'oportunidade' : 'oportunidades'}`;
    }

    const metricPipelineVal = document.getElementById('metric-pipeline-val');
    if (metricPipelineVal) {
      const estimatedVal = leads.length * 1490;
      metricPipelineVal.textContent = estimatedVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (leads.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:2rem;">Nenhum lead capturado até o momento.</td></tr>';
      return;
    }

    tableBody.innerHTML = '';
    leads.forEach(l => {
      const cleanPhone = (l.whatsapp || '').replace(/\D/g, '');
      const waLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : '#';
      const rawDate = l.criado_em || l.created_at;
      const dateStr = rawDate ? new Date(rawDate).toLocaleString('pt-BR') : '—';
      const utmInfo = l.utm_source ? `${l.utm_source}${l.utm_campaign ? ' / ' + l.utm_campaign : ''}` : 'Direto';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size:0.85rem;color:var(--text-muted);white-space:nowrap;">${dateStr}</td>
        <td><strong>${escapeHtml(l.nome)}</strong></td>
        <td>
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" style="color:var(--brand-blue);text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
            💬 ${escapeHtml(l.whatsapp)}
          </a>
        </td>
        <td>
          <span class="badge" style="background:rgba(139,92,246,0.15);color:var(--primary-light);border:1px solid rgba(139,92,246,0.3);">
            ${escapeHtml(l.segmento || 'Não informado')}
          </span>
          <span style="font-size:0.8rem;color:var(--text-muted);margin-left:4px;">
            (${escapeHtml(l.tamanho_alunos || '—')})
          </span>
        </td>
        <td>
          <select class="form-control" style="padding:3px 8px;font-size:0.75rem;width:auto;height:auto;" onchange="updateLeadStatus('${l.id}', this.value)">
            <option value="novo" ${l.status === 'novo' ? 'selected' : ''}>Novo</option>
            <option value="em_contato" ${l.status === 'em_contato' ? 'selected' : ''}>Em Contato</option>
            <option value="matriculado" ${l.status === 'matriculado' ? 'selected' : ''}>Matriculado</option>
            <option value="descartado" ${l.status === 'descartado' ? 'selected' : ''}>Descartado</option>
          </select>
        </td>
        <td style="font-size:0.8rem;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(utmInfo)}">
          ${escapeHtml(utmInfo)}
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Erro ao carregar leads:', err);
    tableBody.innerHTML = '<tr><td colspan="6" class="text-danger">Erro ao carregar leads da API.</td></tr>';
  }
}

if (typeof window !== 'undefined') {
  const prevLoadAll = window.loadAll;
  window.loadAll = async function () {
    if (typeof prevLoadAll === 'function') {
      try { await prevLoadAll(); } catch (e) { console.error(e); }
    }
    await loadLeads();
  };
}