import { jwtService } from './src/services/jwtService';
import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

const jwt = jwtService();
const token = jwt.generateAccessToken({ userId: 'fake-id', email: 'a@a.com', username: 'a' });
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/projects/e372a05e-5883-4ce7-847c-a9194afb8dbc/members',
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + token }
};
const req = http.request(options, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});
req.on('error', console.error);
req.end();
