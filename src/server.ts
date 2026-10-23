import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`lang-pack-crud-express listening on port ${config.port} (${config.env})`);
});
