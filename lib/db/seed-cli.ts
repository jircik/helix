import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());

const [{ getDb }, { seedStages }] = await Promise.all([
  import('./client'),
  import('./seed'),
]);

seedStages(getDb());
console.log('Etapas padrão gravadas.');
