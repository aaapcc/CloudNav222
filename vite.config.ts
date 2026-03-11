import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // CSS 配置
      css: {
        // 启用 CSS 源码映射
        devSourcemap: true,
        // 预处理器选项（如果你使用 Sass/Less 等）
        preprocessorOptions: {
          // 这里可以添加预处理器的全局变量等
        },
        // CSS 模块化配置
        modules: {
          // 生成更友好的类名
          generateScopedName: mode === 'production' 
            ? '[hash:base64:8]' 
            : '[name]__[local]--[hash:base64:5]',
        },
      },
      // 构建配置
      build: {
        // 输出目录
        outDir: 'dist',
        // 静态资源目录
        assetsDir: 'assets',
        // 生成 sourcemap
        sourcemap: mode !== 'production',
        // 启用/禁用 CSS 代码分割
        cssCodeSplit: true,
        // chunk 大小警告限制
        chunkSizeWarningLimit: 1000,
        // Rollup 配置
        rollupOptions: {
          // 确保正确处理多入口
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
          output: {
            // 静态资源命名规则
            assetFileNames: (assetInfo) => {
              // 如果是 CSS 文件
              if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                return 'assets/[name].[hash].[ext]';
              }
              // 其他资源
              return 'assets/[name].[hash].[ext]';
            },
            // JS 文件命名
            chunkFileNames: 'assets/[name].[hash].js',
            entryFileNames: 'assets/[name].[hash].js',
          },
        },
        // 目标浏览器
        target: 'es2020',
        // 最小化配置
        minify: 'esbuild',
        // 用于解决打包后文件过大的警告
        chunkSizeWarningLimit: 600,
      },
      // 优化依赖预构建
      optimizeDeps: {
        include: ['react', 'react-dom'],
      },
    };
});