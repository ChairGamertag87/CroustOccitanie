import axios from 'axios';
export const http = axios.create({ timeout: 15000, headers: { 'User-Agent': 'crous-tlse-bot/2.3' } });