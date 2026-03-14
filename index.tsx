import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import NotFound from './NotFound'; // 导入 404 组件

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />, // 当路由出错时显示 NotFound
  },
  {
    path: '/category/:categoryId',
    element: <App />,
    errorElement: <NotFound />,
  },
  {
    path: '*', // 匹配所有未定义的路径
    element: <NotFound />,
  },
]);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);