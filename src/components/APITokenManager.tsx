import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Clock } from 'lucide-react';
import { toast } from '../store/useToast';
import { backend } from '../services/backendAdapter';
import { useAppStore } from '../store/useAppStore';

interface APIToken {
  id: string;
  name: string;
  permissions: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export const APITokenManager: React.FC = () => {
  const { language } = useAppStore();
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenPermissions, setNewTokenPermissions] = useState('read');
  const [newTokenExpiry, setNewTokenExpiry] = useState<number | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const response = await fetch(`${backend.backendUrl}/tokens`, {
        headers: backend['getAuthHeaders']()
      });
      if (response.ok) {
        const data = await response.json();
        setTokens(data);
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
    }
  };

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast.error(t('请输入Token名称', 'Please enter token name'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backend.backendUrl}/tokens`, {
        method: 'POST',
        headers: {
          ...backend['getAuthHeaders'](),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTokenName,
          permissions: newTokenPermissions,
          expires_in_days: newTokenExpiry
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedToken(data.token);
        setShowToken(true);
        await loadTokens();
        setNewTokenName('');
        setNewTokenPermissions('read');
        setNewTokenExpiry(null);
        toast.success(t('Token创建成功', 'Token created successfully'));
      } else {
        const error = await response.json();
        toast.error(error.error || t('创建失败', 'Creation failed'));
      }
    } catch (err) {
      console.error('Failed to create token:', err);
      toast.error(t('创建失败', 'Creation failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm(t('确定要删除这个Token吗？', 'Are you sure you want to delete this token?'))) {
      return;
    }

    try {
      const response = await fetch(`${backend.backendUrl}/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: backend['getAuthHeaders']()
      });

      if (response.ok) {
        await loadTokens();
        toast.success(t('Token已删除', 'Token deleted'));
      } else {
        toast.error(t('删除失败', 'Deletion failed'));
      }
    } catch (err) {
      console.error('Failed to delete token:', err);
      toast.error(t('删除失败', 'Deletion failed'));
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success(t('Token已复制到剪贴板', 'Token copied to clipboard'));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('无', 'None');
    return new Date(dateStr).toLocaleString();
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'read':
        return t('只读', 'Read Only');
      case 'write':
        return t('读写', 'Read/Write');
      case 'admin':
        return t('管理员', 'Admin');
      default:
        return permission;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('API Token管理', 'API Token Management')}
          </h3>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('创建Token', 'Create Token')}</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            {t('创建新的API Token', 'Create New API Token')}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('Token名称', 'Token Name')} *
              </label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={t('例如: CI/CD Token', 'e.g., CI/CD Token')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('权限级别', 'Permission Level')}
              </label>
              <select
                value={newTokenPermissions}
                onChange={(e) => setNewTokenPermissions(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="read">{t('只读 - 仅查看数据', 'Read Only - View data only')}</option>
                <option value="write">{t('读写 - 查看和修改数据', 'Read/Write - View and modify data')}</option>
                <option value="admin">{t('管理员 - 完全访问权限', 'Admin - Full access')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('有效期', 'Expiration')}
              </label>
              <select
                value={newTokenExpiry || ''}
                onChange={(e) => setNewTokenExpiry(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">{t('永不过期', 'Never expire')}</option>
                <option value="7">{t('7天', '7 days')}</option>
                <option value="30">{t('30天', '30 days')}</option>
                <option value="90">{t('90天', '90 days')}</option>
                <option value="365">{t('1年', '1 year')}</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCreateToken}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? t('创建中...', 'Creating...') : t('创建', 'Create')}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreatedToken(null);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                {t('取消', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {createdToken && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-green-900 dark:text-green-100">
              {t('Token创建成功！请立即保存', 'Token Created! Save it now')}
            </h4>
            <button
              onClick={() => setShowToken(!showToken)}
              className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
            >
              {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {showToken && (
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-700 text-sm font-mono break-all">
                {createdToken}
              </code>
              <button
                onClick={() => handleCopyToken(createdToken)}
                className="p-2 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          )}
          <p className="mt-2 text-sm text-green-700 dark:text-green-300">
            {t('⚠️ 这是唯一一次显示Token的机会，请妥善保存！', '⚠️ This is the only time the token will be shown, please save it securely!')}
          </p>
        </div>
      )}

      {tokens.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('暂无API Token', 'No API tokens yet')}
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{token.name}</h4>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    {getPermissionLabel(token.permissions)}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{t('创建于', 'Created')}: {formatDate(token.created_at)}</span>
                  </div>
                  {token.last_used_at && (
                    <span>{t('最后使用', 'Last used')}: {formatDate(token.last_used_at)}</span>
                  )}
                  {token.expires_at && (
                    <span className="text-orange-600 dark:text-orange-400">
                      {t('过期时间', 'Expires')}: {formatDate(token.expires_at)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDeleteToken(token.id)}
                className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          {t('使用说明', 'Usage Instructions')}
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• {t('API Token用于通过HTTP请求访问后端API', 'API tokens are used to access backend APIs via HTTP requests')}</li>
          <li>• {t('在请求头中添加: Authorization: Bearer YOUR_TOKEN', 'Add to request header: Authorization: Bearer YOUR_TOKEN')}</li>
          <li>• {t('Token只会在创建时显示一次，请妥善保存', 'Token is shown only once during creation, please save it securely')}</li>
          <li>• {t('可以为不同的应用或场景创建不同的Token', 'Create different tokens for different applications or scenarios')}</li>
        </ul>
      </div>
    </div>
  );
};
