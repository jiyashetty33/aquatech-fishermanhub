document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const status = document.getElementById('loginStatus');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = 'Logging in...';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const result = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem('jwtToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      const role = result.user.role;
      if (role === 'PORT_OFFICIAL' || role === 'ADMIN') {
        window.location.href = 'official.html';
      } else if (role === 'FISHERMAN') {
        window.location.href = 'fisherman.html';
      } else {
        window.location.href = 'marketplace.html';
      }
    } catch (error) {
      status.textContent = error.message || 'Login failed';
    }
  });
});
