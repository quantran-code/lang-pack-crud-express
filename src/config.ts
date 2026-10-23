export interface ServiceConfig {
  port: number;
  env: string;
}

export const config: ServiceConfig = {
  port: Number(process.env.PORT) || 3100,
  env: process.env.NODE_ENV || 'development',
};
