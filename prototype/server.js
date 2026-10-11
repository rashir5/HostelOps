const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'};
http.createServer((req,res)=>{const name = req.url.split('?')[0]; if(!['/','/index.html','/styles.css','/app.js','/passes.js','/qr-library.js','/promotions.js','/students-data.js'].includes(name)){res.writeHead(404);return res.end('Not found');} const file = path.join(__dirname, name === '/' ? 'index.html' : name); fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':(types[path.extname(file)]||'text/plain')+'; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(err?'Not found':data);});}).listen(3000,'127.0.0.1',()=>console.log('Hostel Ops: http://localhost:3000'));
