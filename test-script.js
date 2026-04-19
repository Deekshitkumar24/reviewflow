const http = require('http');
async function test() {
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@reviewflow.app', password: 'Admin@123' })
  });
  
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  console.log('Login status:', loginRes.status, !!token);
  
  const res = await fetch('http://localhost:3000/api/v1/events', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({
      eventName: 'Test Error Event 4',
      organizerName: 'Test Org',
      eventDate: '2026-05-15',
      venue: 'Test Venue',
      eventType: 'multi_round',
      totalRounds: 1,
      suggestionsEnabled: true,
      allowMultiMentorReview: false,
      rounds: [{ roundName: 'Round 1', roundOrder: 1 }]
    })
  });
  console.log('Event Status:', res.status);
  const text = await res.text();
  console.log('Event Response:', text);
}
test().catch(console.error);
