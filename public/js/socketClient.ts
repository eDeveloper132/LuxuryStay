import io from 'socket.io-client';

const socket = io('http://localhost:2000');

// Jab naya housekeeping task schedule ho
socket.on('housekeeping:scheduled', (data:any) => {
  console.log('New HK task:', data);
  // Yahan apki DOM update logic – jaise ek notification badge increment karna
});

// Jab maintenance issue report ho
socket.on('maintenance:reported', (data:any) => {
  console.log('New Maintenance:', data);
  // Yahan UI update – jaise sidebar mein alert show karna
});
