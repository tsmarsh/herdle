import { rmSync, mkdirSync, cpSync } from 'fs';

rmSync('www', { recursive: true, force: true });
mkdirSync('www');
cpSync('index.html', 'www/index.html');
cpSync('style.css', 'www/style.css');
cpSync('dist', 'www/dist', { recursive: true });
