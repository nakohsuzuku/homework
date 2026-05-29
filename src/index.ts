import express from 'express';
import path from 'path';
import { config } from './config';
import routes from './routes';
import { errorHandler, notFound } from './middlewares/errorHandler';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

// CI 模式支持
if (process.argv.includes('--ci')) {
  import('./ci').then(({ runCI }) => runCI());
} else {
  app.listen(config.port, () => {
    console.log(`🚀 智能代码审查助手服务启动成功`);
    console.log(`📍 服务地址: http://localhost:${config.port}`);
    console.log(`🔗 API文档: http://localhost:${config.port}/api`);
  });
}