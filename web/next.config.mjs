/** @type {import('next').NextConfig} */
const nextConfig = {
  // Статический экспорт: сайт собирается в чистый HTML и кладётся на Vercel
  // как статика — никакого сервера/бэкенда (см. CLAUDE.md §2).
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
