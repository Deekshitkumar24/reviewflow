const http = require('http');

async function test() {
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@reviewflow.app', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  console.log('Admin login status:', loginRes.status);
  
  // Create coordinator
  const createRes = await fetch('http://localhost:3000/api/v1/users', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({
      fullName: 'Coordinator Test',
      email: 'coord.test@reviewflow.app',
      role: 'coordinator'
    })
  });
  const createData = await createRes.json();
  console.log('Create coordinator status:', createRes.status);
  const tempPassword = createData.data?.tempPassword;
  console.log('Temp password:', tempPassword);

  // Login as coordinator
  const coordLoginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coord.test@reviewflow.app', password: tempPassword })
  });
  const coordLoginData = await coordLoginRes.json();
  console.log('Coord login status:', coordLoginRes.status);
  console.log('Coord login response:', JSON.stringify(coordLoginData));
}
test().catch(console.error);
