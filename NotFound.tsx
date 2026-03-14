import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} className="text-amber-600 dark:text-amber-400" />
        </div>
        
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">
          页面不存在
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          您访问的链接可能已失效、被删除，或者您输入的地址有误。
          <br />
          <br />
          请确认当前链接是否正确？
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Home size={18} />
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;