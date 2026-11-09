import express from 'express';
import {resolve} from 'node:path';
const app=express();app.disable('x-powered-by');app.use('/epc',express.static(resolve('public-demo'),{dotfiles:'ignore'}));app.get('/',(req,res)=>res.redirect('/epc/'));app.listen(4311,'127.0.0.1',()=>console.log('Public sample demo preview: http://127.0.0.1:4311/epc/'));
