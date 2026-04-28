// Domain types — add as the project grows

export * from './domain';

export type ApiResponse<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: string;
};

export type HealthResponse = {
  status: 'ok';
  service: string;
  env: string;
};
