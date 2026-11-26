(function () {
  // 1. Limpa qualquer query string da URL para evitar vazamento de IDs/dados na barra de endereço
  if (window.location.search) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // 2. Oculta o conteúdo da página imediatamente até validar o acesso
  document.documentElement.style.visibility = 'hidden';

  const path = window.location.pathname.toLowerCase();
  const token = localStorage.getItem('fit_token');
  const role = localStorage.getItem('fit_role');
  const isDemo = localStorage.getItem('fit_is_demo') === 'true';

  
    const regrasPorPagina = [
    { match: ['/superadmin.html', '/superadmin'], roles: ['superadmin'], permiteDemo: false },
    { match: ['/admin.html', '/admin'], roles: ['admin'], permiteDemo: true },
    { match: ['/aluno.html', '/aluno'], roles: ['aluno'], permiteDemo: false }
  ];

  const cleanPath = path.replace(/\/+$/, '');
  const regra = regrasPorPagina.find(r => r.match.some(m => cleanPath.endsWith(m)));


  const tokenInvalido = !token || (!regra.permiteDemo && (isDemo || token === 'demo_token_fitgesty'));
  const roleInvalida = !role || !regra.roles.includes(role);

  if (tokenInvalido || roleInvalida) {
    localStorage.removeItem('fit_token');
    localStorage.removeItem('fit_role');
    localStorage.removeItem('fit_is_demo');
    window.location.replace('/login.html');
    return;
  }

  // 3. Se não for demo no admin, valida o token no servidor antes de liberar a tela
  if (isDemo && regra.permiteDemo) {
    document.documentElement.style.visibility = 'visible';
    return;
  }

  fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => {
      if (!res.ok) throw new Error('Sessão inválida');
      return res.json();
    })
    .then(user => {
      if (!user || !regra.roles.includes(user.role)) {
        throw new Error('Perfil não autorizado');
      }
      // Garante que o localStorage reflita apenas o usuário real autenticado no servidor
      localStorage.setItem('fit_role', user.role);
      if (user.academyId) localStorage.setItem('fit_academy_id', user.academyId);
      if (user.id) localStorage.setItem('fit_user_id', user.id);
      document.documentElement.style.visibility = 'visible';
    })
    .catch(() => {
      localStorage.removeItem('fit_token');
      localStorage.removeItem('fit_role');
      localStorage.removeItem('fit_is_demo');
      window.location.replace('/login.html');
    });
})();