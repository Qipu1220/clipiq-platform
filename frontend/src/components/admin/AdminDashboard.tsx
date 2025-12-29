import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  banUserByUsername,
  unbanUserByUsername,
  deleteUserByUsername,
  updateUserRole
} from '../../store/usersSlice';
import { logoutThunk } from '../../store/authSlice';
import { toggleMaintenanceMode, setMaintenanceMode, setServiceMaintenanceMode } from '../../store/systemSlice';
import { setMaintenanceMode as setAuthMaintenanceMode } from '../../store/authSlice';
import {
  Shield, Users, Settings, Activity, TrendingUp, Eye, UserX, Trash2,
  Search, Play, User, ChevronDown, LogOut, BarChart3, Clock, Video,
  AlertTriangle, CheckCircle, Plus, Edit2, Power, Database, FileText,
  UserPlus, Crown, Zap, Download, Save, Loader2
} from 'lucide-react';
import { Button as ButtonComponent } from '../ui/button';
const Button = ButtonComponent as any;
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { AdminProfile } from './AdminProfile';
import { AdminUserManagement } from './AdminUserManagement';
import { BanUserModal } from '../shared/BanUserModal';
import { toast } from 'sonner';
import { fetchDashboardSummaryApi, DashboardSummaryResponse, fetchAllUsersApi, getStaffMembersApi, promoteStaffApi, createStaffApi, demoteStaffApi, deleteStaffAccountApi, banUserApi, unbanUserApi, deleteUserApi, fetchSystemLogsApi, fetchAnalyticsApi, AnalyticsStats, toggleMaintenanceModeApi, toggleServiceMaintenanceModeApi, fetchGeneralSettingsApi, updateGeneralSettingsApi, GeneralSettings, User as ApiUser, SystemLog } from '../../api/admin';
import { formatCount, formatWatchTime } from '../../utils/formatters';
import { Skeleton } from '../ui/skeleton';

interface AdminDashboardProps {
  onVideoClick: (videoId: string) => void;
  onViewUserProfile: (username: string) => void;
}

export function AdminDashboard({ onVideoClick, onViewUserProfile }: AdminDashboardProps) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);
  const videos = useSelector((state: RootState) => state.videos.videos);
  const videoReports = useSelector((state: RootState) => state.reports.videoReports);
  const userReports = useSelector((state: RootState) => state.reports.userReports);
  const maintenanceMode = useSelector((state: RootState) => state.system?.maintenanceMode || false);
  const serviceMaintenanceMode = useSelector((state: RootState) => state.system?.serviceMaintenanceMode || false);

  const [activeTab, setActiveTab] = useState('dashboard' as 'dashboard' | 'users' | 'staff' | 'analytics' | 'system-logs' | 'settings' | 'profile');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newStaffData, setNewStaffData] = useState({ username: '', password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState(null as string | null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null as {
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null as DashboardSummaryResponse['data'] | null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null as string | null);

  // Users state for admin tab
  const [users, setUsers] = useState([] as ApiUser[]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null as string | null);
  const [userFilter, setUserFilter] = useState('all' as 'all' | 'active' | 'banned');

  // Ban modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUsername, setBanUsername] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('');

  // Staff state for staff tab
  const [staff, setStaff] = useState([] as ApiUser[]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState(null as string | null);
  const [staffFilter, setStaffFilter] = useState('all' as 'all' | 'demoted' | 'active');
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);

  // Analytics state for analytics tab
  const [analytics, setAnalytics] = useState(null as AnalyticsStats | null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null as string | null);

  // General settings state
  const [generalSettings, setGeneralSettings] = useState(null as GeneralSettings | null);
  const [generalSettingsLoading, setGeneralSettingsLoading] = useState(false);
  const [generalSettingsError, setGeneralSettingsError] = useState(null as string | null);
  const [generalSettingsSaving, setGeneralSettingsSaving] = useState(false);
  const [generalSettingsForm, setGeneralSettingsForm] = useState({
    siteName: '',
    maxUploadSizeMB: 100,
    maxVideoDurationSeconds: 60
  });

  // System logs state
  const [systemLogs, setSystemLogs] = useState([] as SystemLog[]);
  const [systemLogsLoading, setSystemLogsLoading] = useState(false);
  const [systemLogsError, setSystemLogsError] = useState(null as string | null);
  const [systemLogsPage, setSystemLogsPage] = useState(1);
  const [systemLogsTotal, setSystemLogsTotal] = useState(0);
  const [systemLogsFilter, setSystemLogsFilter] = useState('all' as 'all' | 'user' | 'staff' | 'maintenance' | 'settings');


  const userMenuRef = useRef(null as HTMLDivElement | null);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Fetch dashboard data when component mounts or tab changes to dashboard
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

  // Fetch users when tab switches to users or filter changes
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, userFilter]);

  // Fetch staff when tab switches to staff or filter changes
  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab, staffFilter]);

  // Fetch analytics when tab switches to analytics
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  // Fetch general settings when tab switches to settings
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchGeneralSettings();
    }
  }, [activeTab]);

  // Fetch system logs when tab switches to system-logs or filter changes
  useEffect(() => {
    if (activeTab === 'system-logs') {
      fetchSystemLogs();
    }
  }, [activeTab, systemLogsPage, systemLogsFilter]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const response = await fetchDashboardSummaryApi();
      setDashboardData(response.data);
      // Update maintenance mode in Redux from API response (sync cả 2 slices)
      const apiMaintenanceMode = response.data.stats.system.maintenanceMode;
      const apiServiceMaintenanceMode = response.data.stats.system.serviceMaintenanceMode || false;
      if (apiMaintenanceMode !== maintenanceMode) {
        dispatch(setMaintenanceMode(apiMaintenanceMode)); // systemSlice
        dispatch(setAuthMaintenanceMode(apiMaintenanceMode)); // authSlice
      }
      if (apiServiceMaintenanceMode !== serviceMaintenanceMode) {
        dispatch(setServiceMaintenanceMode(apiServiceMaintenanceMode));
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardError(error.response?.data?.detail || 'Không thể tải dữ liệu dashboard');
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchSystemLogs = async () => {
    setSystemLogsLoading(true);
    setSystemLogsError(null);
    try {
      // Map filter to actionType
      let actionType: string | undefined = undefined;
      let limit = 50;

      if (systemLogsFilter === 'user') {
        // Fetch all and filter client-side for user actions
        actionType = undefined;
        limit = 500; // Fetch more to ensure we get all user-related logs
      } else if (systemLogsFilter === 'staff') {
        actionType = undefined;
        limit = 500; // Fetch more for staff actions
      } else if (systemLogsFilter === 'maintenance') {
        actionType = undefined;
        limit = 500; // Fetch more for maintenance actions
      } else if (systemLogsFilter === 'settings') {
        actionType = 'settings_updated';
        limit = 50;
      } else {
        // All logs
        limit = 50;
      }

      const response = await fetchSystemLogsApi({
        page: 1, // Always fetch from page 1 when filtering
        limit,
        actionType
      });

      // Filter logs client-side for grouped filters
      let filteredLogs = response.data.logs;
      if (systemLogsFilter === 'user') {
        filteredLogs = response.data.logs.filter(log => {
          const actionLower = log.action.toLowerCase();
          return actionLower.includes('user banned') ||
            actionLower.includes('user unbanned') ||
            actionLower.includes('user deleted');
        });
      } else if (systemLogsFilter === 'staff') {
        filteredLogs = response.data.logs.filter(log => {
          const actionLower = log.action.toLowerCase();
          return actionLower.includes('staff promoted') ||
            actionLower.includes('staff demoted') ||
            actionLower.includes('staff deleted');
        });
      } else if (systemLogsFilter === 'maintenance') {
        filteredLogs = response.data.logs.filter(log => {
          const actionLower = log.action.toLowerCase();
          return actionLower.includes('maintenance mode');
        });
      }

      setSystemLogs(filteredLogs);
      // For filtered results, use filtered count, otherwise use total
      if (systemLogsFilter === 'all' || systemLogsFilter === 'settings') {
        setSystemLogsTotal(response.data.pagination.total);
      } else {
        setSystemLogsTotal(filteredLogs.length);
      }
    } catch (error: any) {
      setSystemLogsError(error.message || 'Failed to fetch system logs');
      toast.error('Không thể tải lịch sử hệ thống');
    } finally {
      setSystemLogsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      let banned: boolean | undefined = undefined;
      if (userFilter === 'active') {
        banned = false;
      } else if (userFilter === 'banned') {
        banned = true;
      }
      // Get only regular users (role='user'), staff has separate panel
      const response = await fetchAllUsersApi({
        role: 'user',
        banned,
        limit: 1000
      });
      setUsers(response.data.users);
    } catch (error: any) {
      setUsersError(error.message || 'Failed to fetch users');
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchStaff = async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      let isDemoted: boolean | undefined = undefined;
      if (staffFilter === 'active') {
        isDemoted = false;
      } else if (staffFilter === 'demoted') {
        isDemoted = true;
      }
      // Note: New staff (is_demoted = null) should be considered as demoted per requirements
      const response = await getStaffMembersApi(isDemoted);
      setStaff(response.data.staff);
    } catch (error: any) {
      setStaffError(error.message || 'Failed to fetch staff');
      toast.error('Không thể tải danh sách staff');
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const response = await fetchAnalyticsApi();
      setAnalytics(response.data);
    } catch (error: any) {
      setAnalyticsError(error.message || 'Failed to fetch analytics');
      toast.error('Không thể tải thống kê');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchGeneralSettings = async () => {
    setGeneralSettingsLoading(true);
    setGeneralSettingsError(null);
    try {
      const response = await fetchGeneralSettingsApi();
      setGeneralSettings(response.data);
      setGeneralSettingsForm({
        siteName: response.data.siteName,
        maxUploadSizeMB: response.data.maxUploadSizeMB,
        maxVideoDurationSeconds: response.data.maxVideoDurationSeconds
      });
    } catch (error: any) {
      setGeneralSettingsError(error.message || 'Failed to fetch general settings');
      toast.error('Không thể tải cài đặt');
    } finally {
      setGeneralSettingsLoading(false);
    }
  };

  const handleSaveGeneralSettings = async () => {
    setGeneralSettingsSaving(true);
    try {
      const response = await updateGeneralSettingsApi(generalSettingsForm);
      setGeneralSettings(response.data);
      toast.success('Đã lưu cài đặt thành công');
      if (activeTab === 'system-logs') {
        fetchSystemLogs();
      } else {
        fetchDashboardData(); // Refresh dashboard logs
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Không thể lưu cài đặt');
    } finally {
      setGeneralSettingsSaving(false);
    }
  };

  // Calculate stats from API data only - no fallback to mock data
  const totalUsers = dashboardData?.stats.users.total ?? 0;
  const totalStaff = dashboardData?.stats.users.staff ?? 0;
  const totalVideos = dashboardData?.stats.videos.total ?? 0;
  const bannedUsers = dashboardData?.stats.users.banned ?? 0;
  const activeReports = dashboardData?.stats.reports.pending ?? 0;
  const todayVideos = dashboardData?.stats.videos.uploadedToday ?? 0;
  const views24h = dashboardData?.stats.videos.views24h ?? 0;
  const dashboardSystemLogs = dashboardData?.systemLogs ?? [];

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      (user.displayName && user.displayName.toLowerCase().includes(query)) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const handlePromoteStaff = (username: string) => {
    setConfirmAction({
      title: 'Xác nhận thăng cấp Staff',
      message: `Bạn có chắc muốn thăng cấp ${username} lên staff?`,
      confirmText: 'Thăng cấp',
      confirmColor: '#ff3b5c',
      onConfirm: async () => {
        try {
          await promoteStaffApi(username);
          toast.success(`Đã thăng cấp ${username} lên staff`);
          setShowConfirmModal(false);
          fetchStaff();
          if (activeTab === 'system-logs') {
            fetchSystemLogs();
          } else {
            fetchDashboardData(); // Refresh dashboard logs
          }
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Không thể thăng cấp staff');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Password validation function
  const validatePassword = (password: string): string => {
    if (!password) return 'Mật khẩu không được để trống';
    if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
    if (password.length > 128) return 'Mật khẩu không được quá 128 ký tự';
    return '';
  };

  const handleCreateStaff = async () => {
    if (!newStaffData.username.trim() || !newStaffData.password.trim()) {
      toast.error('Vui lòng điền đầy đủ username và mật khẩu');
      return;
    }

    // Validate password before submit
    const error = validatePassword(newStaffData.password);
    if (error) {
      setPasswordError(error);
      setPasswordTouched(true);
      toast.error(error);
      return;
    }

    try {
      await createStaffApi({
        username: newStaffData.username.trim(),
        password: newStaffData.password
      });

      toast.success(`Đã tạo tài khoản staff: ${newStaffData.username}`);
      setNewStaffData({ username: '', password: '' });
      setPasswordError('');
      setPasswordTouched(false);
      fetchStaff();

      if (activeTab === 'system-logs') {
        fetchSystemLogs();
      } else {
        fetchDashboardData();
      }
    } catch (error: any) {
      // Display backend validation error if available
      if (error.response?.data?.errors) {
        const passwordErr = error.response.data.errors.find(
          (e: any) => e.field === 'password'
        );
        if (passwordErr) {
          setPasswordError(passwordErr.message);
          setPasswordTouched(true);
          toast.error(passwordErr.message);
          return;
        }
      }
      const errorMsg = error.response?.data?.error || 'Không thể tạo tài khoản staff';
      toast.error(errorMsg);
    }
  };

  const handleDemoteStaff = (username: string) => {
    setConfirmAction({
      title: 'Xác nhận hạ cấp Staff',
      message: `Bạn có chắc muốn hạ cấp ${username}?`,
      confirmText: 'Hạ cấp',
      confirmColor: '#ff3b5c',
      onConfirm: async () => {
        try {
          await demoteStaffApi(username);
          toast.success(`Đã hạ cấp ${username}`);
          setShowConfirmModal(false);
          fetchStaff();
          if (activeTab === 'system-logs') {
            fetchSystemLogs();
          } else {
            fetchDashboardData(); // Refresh dashboard logs
          }
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Không thể hạ cấp staff');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteStaffAccount = (username: string) => {
    setConfirmAction({
      title: 'Xác nhận xóa tài khoản',
      message: `Bạn có chắc muốn xóa vĩnh viễn tài khoản ${username}? Hành động này không thể hoàn tác!`,
      confirmText: 'Xóa vĩnh viễn',
      confirmColor: '#ef4444',
      onConfirm: async () => {
        try {
          await deleteStaffAccountApi(username);
          toast.success(`Đã xóa tài khoản ${username}`);
          setShowConfirmModal(false);
          fetchStaff();
          if (activeTab === 'system-logs') {
            fetchSystemLogs();
          } else {
            fetchDashboardData(); // Refresh dashboard logs
          }
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Không thể xóa tài khoản staff');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleUnbanUser = (username: string) => {
    setConfirmAction({
      title: 'Xác nhận Unban người dùng',
      message: `Bạn có chắc muốn unban người dùng ${username}?`,
      confirmText: 'Unban',
      confirmColor: '#10b981',
      onConfirm: async () => {
        try {
          await unbanUserApi(username);
          dispatch(unbanUserByUsername(username));
          toast.success(`Đã unban người dùng ${username}`);
          setShowConfirmModal(false);
          fetchUsers();
          if (activeTab === 'system-logs') {
            fetchSystemLogs();
          } else {
            fetchDashboardData(); // Refresh dashboard logs
          }
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Không thể unban người dùng');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteUser = (username: string) => {
    setConfirmAction({
      title: 'Xác nhận xóa người dùng',
      message: `Bạn có chắc muốn xóa vĩnh viễn người dùng ${username}? Hành động này không thể hoàn tác!`,
      confirmText: 'Xóa vĩnh viễn',
      confirmColor: '#ef4444',
      onConfirm: async () => {
        try {
          await deleteUserApi(username);
          dispatch(deleteUserByUsername(username));
          toast.success(`Đã xóa người dùng ${username}`);
          setShowConfirmModal(false);
          fetchUsers();
          if (activeTab === 'system-logs') {
            fetchSystemLogs();
          } else {
            fetchDashboardData(); // Refresh dashboard logs
          }
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Không thể xóa người dùng');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleBanUser = async () => {
    if (!banUsername) {
      toast.error('Vui lòng nhập tên người dùng!');
      return;
    }
    if (!banReason) {
      toast.error('Vui lòng nhập lý do cấm!');
      return;
    }

    const durationValue = banDuration ? parseInt(banDuration, 10) : undefined;
    if (durationValue !== undefined && (Number.isNaN(durationValue) || durationValue <= 0)) {
      toast.error('Thời hạn cấm phải là số ngày hợp lệ!');
      return;
    }
    const isPermanent = !durationValue;

    setConfirmAction({
      title: isPermanent ? 'Cấm vĩnh viễn người dùng' : 'Cấm tạm thời người dùng',
      message: isPermanent
        ? `Bạn có chắc muốn cấm vĩnh viễn người dùng ${banUsername}?`
        : `Bạn có chắc muốn cấm người dùng ${banUsername} trong ${durationValue} ngày?`,
      confirmText: isPermanent ? 'Cấm vĩnh viễn' : 'Cấm tạm thời',
      confirmColor: '#ff3b5c',
      onConfirm: async () => {
        try {
          await banUserApi(banUsername, banReason, durationValue);
          toast.success(isPermanent ? `Đã cấm vĩnh viễn người dùng ${banUsername}` : `Đã cấm người dùng ${banUsername} trong ${durationValue} ngày`);
          const response = await fetchAllUsersApi({ page: 1, limit: 1000 });
          setUsers(response.data.users);
          setBanUsername('');
          setBanDuration('');
          setBanReason('');
          setShowConfirmModal(false);
          setShowBanModal(false);
          if (activeTab === 'system-logs') {
            fetchSystemLogs();
          } else {
            fetchDashboardData(); // Refresh dashboard logs
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            toast.error('Không tìm thấy người dùng');
          } else {
            toast.error('Không thể cấm người dùng. Vui lòng thử lại.');
          }
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleToggleMaintenance = async () => {
    const newStatus = !maintenanceMode;
    try {
      await toggleMaintenanceModeApi(newStatus);
      // Update cả systemSlice và authSlice để sync state
      dispatch(setMaintenanceMode(newStatus)); // systemSlice
      dispatch(setAuthMaintenanceMode(newStatus)); // authSlice
      toast.success(newStatus ? 'Đã bật chế độ bảo trì hệ thống' : 'Đã tắt chế độ bảo trì hệ thống');
      // Refetch dashboard data after toggling maintenance mode
      setTimeout(() => {
        fetchDashboardData();
        if (activeTab === 'system-logs') {
          fetchSystemLogs();
        }
      }, 500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Không thể thay đổi chế độ bảo trì hệ thống');
    }
  };

  const handleToggleServiceMaintenance = async () => {
    const newStatus = !serviceMaintenanceMode;
    try {
      await toggleServiceMaintenanceModeApi(newStatus);
      dispatch(setServiceMaintenanceMode(newStatus));
      toast.success(newStatus ? 'Đã bật chế độ bảo trì dịch vụ' : 'Đã tắt chế độ bảo trì dịch vụ');
      // Refetch dashboard data after toggling service maintenance mode
      setTimeout(() => {
        fetchDashboardData();
        if (activeTab === 'system-logs') {
          fetchSystemLogs();
        }
      }, 500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Không thể thay đổi chế độ bảo trì dịch vụ');
    }
  };

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-60 bg-zinc-950 flex flex-col border-r border-zinc-900/50 flex-shrink-0">
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <img
            src="https://res.cloudinary.com/dranb4kom/image/upload/v1764573751/Logo_4x_vacejp.png"
            alt="ShortV Logo"
            className="w-6 h-6 object-contain"
          />
          <h1 className="text-white text-xl tracking-tight logo-text">shortv</h1>
          <div className="ml-auto">
            <Crown className="w-5 h-5 text-yellow-500" />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="px-2 space-y-0.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'dashboard'
                ? 'bg-zinc-900/40 text-white'
                : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
                }`}
            >
              <BarChart3 className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'users'
                ? 'bg-zinc-900/40 text-white'
                : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 ${activeTab === 'users' ? 'text-[#ff3b5c]' : ''}`} />
                <span>Quản lý User</span>
              </div>
              <div className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                {totalUsers}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'staff'
                ? 'bg-zinc-900/40 text-white'
                : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${activeTab === 'staff' ? 'text-[#ff3b5c]' : ''}`} />
                <span>Quản lý Staff</span>
              </div>
              <div className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                {totalStaff}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'analytics'
                ? 'bg-zinc-900/40 text-white'
                : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
                }`}
            >
              <TrendingUp className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Thống kê</span>
            </button>

            <button
              onClick={() => setActiveTab('system-logs')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'system-logs'
                ? 'bg-zinc-900/40 text-white'
                : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
                }`}
            >
              <Activity className={`w-5 h-5 ${activeTab === 'system-logs' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Lịch sử hệ thống</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'settings'
                ? 'bg-zinc-900/40 text-white'
                : 'text-zinc-400 hover:bg-zinc-900/30 hover:text-white'
                }`}
            >
              <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-[#ff3b5c]' : ''}`} />
              <span>Cài đặt</span>
            </button>

            <div className="h-px bg-zinc-900/50 my-3 mx-2" />

            <div className="text-zinc-600 text-xs px-3 mb-2 uppercase tracking-wider">Hệ thống</div>
            <div className="px-3 py-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Tổng videos</span>
                <span className="text-white font-medium">
                  {dashboardLoading ? '...' : totalVideos}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Videos hôm nay</span>
                <span className="text-[#ff3b5c] font-medium">
                  {dashboardLoading ? '...' : todayVideos}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Báo cáo chờ</span>
                <span className="text-yellow-500 font-medium">
                  {dashboardLoading ? '...' : activeReports}
                </span>
              </div>
            </div>

            {maintenanceMode && (
              <div className="mx-2 mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-500 text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Chế độ bảo trì</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
        {/* Top Bar */}
        <div className="p-4 border-b border-zinc-900/50 flex justify-between items-center bg-zinc-950 relative z-40 flex-shrink-0">
          <div>
            <h2 className="text-white text-xl">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'users' && 'Quản lý Người dùng'}
              {activeTab === 'staff' && 'Quản lý Staff'}
              {activeTab === 'analytics' && 'Thống kê'}
              {activeTab === 'system-logs' && 'Lịch sử Hệ thống'}
              {activeTab === 'settings' && 'Cài đặt'}
              {activeTab === 'profile' && 'Trang cá nhân'}
            </h2>
          </div>

          <div className="relative z-50" ref={userMenuRef}>
            <div
              className="flex items-center gap-2 text-white cursor-pointer hover:bg-zinc-800 px-3 py-2 rounded-lg transition-all border border-transparent hover:border-zinc-800"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.username}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              )}
              <span className="text-sm">{currentUser?.displayName || currentUser?.username}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </div>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-60 bg-zinc-950 border border-zinc-900/50 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3.5 border-b border-zinc-900/50">
                  <div className="flex items-center gap-3">
                    {currentUser?.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.username}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-zinc-800"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-800">
                        <User className="w-5 h-5 text-zinc-500" />
                      </div>
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-white text-sm font-medium truncate">{currentUser?.displayName || currentUser?.username}</span>
                      <span className="text-zinc-500 text-xs truncate">@{currentUser?.username}</span>
                      <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded mt-1 w-fit">
                        Admin
                      </span>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab('profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-zinc-900/40 transition-colors text-left"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">Trang cá nhân</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      dispatch(logoutThunk() as any);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[#ff3b5c] hover:bg-zinc-900/40 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">
                        {dashboardLoading ? <Skeleton className="h-8 w-12" /> : totalUsers}
                      </div>
                      <div className="text-sm text-zinc-500">Tổng người dùng</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Video className="w-5 h-5 text-purple-500" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">
                        {dashboardLoading ? <Skeleton className="h-8 w-12" /> : totalVideos}
                      </div>
                      <div className="text-sm text-zinc-500">Tổng video</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-[#ff3b5c]/10 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-[#ff3b5c]" />
                        </div>
                        <Clock className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">
                        {dashboardLoading ? <Skeleton className="h-8 w-12" /> : totalStaff}
                      </div>
                      <div className="text-sm text-zinc-500">Staff</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        </div>
                        <Clock className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="text-2xl text-white font-medium mb-1">
                        {dashboardLoading ? <Skeleton className="h-8 w-12" /> : activeReports}
                      </div>
                      <div className="text-sm text-zinc-500">Báo cáo chờ xử lý</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Overview Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* System Status */}
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-900/50 pb-4">
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Database className="w-5 h-5 text-green-500" />
                        Trạng thái Hệ thống
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-white text-sm">Server</span>
                          </div>
                          <span className="text-green-500 text-xs">Online</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-white text-sm">Database</span>
                          </div>
                          <span className="text-green-500 text-xs">Connected</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${maintenanceMode ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                            <span className="text-white text-sm">Application</span>
                          </div>
                          <span className={`text-xs ${maintenanceMode ? 'text-yellow-500' : 'text-green-500'}`}>
                            {maintenanceMode ? 'Maintenance' : 'Running'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-white text-sm">Storage</span>
                          </div>
                          <span className="text-zinc-400 text-xs">
                            {dashboardLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              `${dashboardData?.stats.system.storage.usedFormatted || '0 GB'} / ${dashboardData?.stats.system.storage.maxFormatted || '100 GB'}`
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activities */}
                  <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-900/50 pb-4">
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5 text-[#ff3b5c]" />
                        Hoạt động gần đây
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {dashboardLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
                              <Skeleton className="h-4 w-32 mb-2" />
                              <Skeleton className="h-3 w-full mb-1" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          ))}
                        </div>
                      ) : dashboardSystemLogs.length > 0 ? (
                        <div className="space-y-3">
                          {dashboardSystemLogs.slice(0, 4).map(log => (
                            <div key={log.id} className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-white text-sm font-medium">{log.action}</p>
                                <span className="text-xs text-zinc-500">
                                  {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500">{log.details}</p>
                              <p className="text-xs text-zinc-600 mt-1">Bởi: {log.user}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-zinc-500 text-sm">
                          Không có hoạt động gần đây
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-zinc-950/50 border border-zinc-900/50 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Users đã ban</div>
                    <div className="text-white text-xl font-medium">
                      {dashboardLoading ? <Skeleton className="h-6 w-8" /> : bannedUsers}
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-950/50 border border-zinc-900/50 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Videos hôm nay</div>
                    <div className="text-white text-xl font-medium">
                      {dashboardLoading ? <Skeleton className="h-6 w-8" /> : todayVideos}
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-950/50 border border-zinc-900/50 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Lượt xem hôm nay</div>
                    <div className="text-white text-xl font-medium">
                      {dashboardLoading ? (
                        <Skeleton className="h-6 w-16" />
                      ) : (
                        formatCount(views24h)
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-950/50 border border-zinc-900/50 rounded-xl">
                    <div className="text-zinc-500 text-xs mb-1">Uptime</div>
                    <div className="text-white text-xl font-medium">
                      {dashboardLoading ? (
                        <Skeleton className="h-6 w-16" />
                      ) : (
                        dashboardData?.stats.system.uptime || '99.9%'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <AdminUserManagement
                displayUsers={users}
                onViewUserProfile={onViewUserProfile}
                onBanUser={(username) => {
                  setBanUsername(username);
                  setBanDuration('');
                  setBanReason('');
                  setShowBanModal(true);
                }}
                setShowConfirmModal={setShowConfirmModal}
                setConfirmAction={setConfirmAction}
                setUsers={setUsers}
              />
            )}

            {/* Staff Tab */}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                {/* Filter Buttons with Add Staff Button */}
                <div className="flex justify-between items-center gap-3">
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setStaffFilter('all')}
                      className={`h-10 rounded-lg px-4 ${staffFilter === 'all'
                        ? 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30'
                        : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/50'
                        }`}
                    >
                      Tất cả
                    </Button>
                    <Button
                      onClick={() => setStaffFilter('active')}
                      className={`h-10 rounded-lg px-4 ${staffFilter === 'active'
                        ? 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30'
                        : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/50'
                        }`}
                    >
                      Đang hoạt động
                    </Button>
                    <Button
                      onClick={() => setStaffFilter('demoted')}
                      className={`h-10 rounded-lg px-4 ${staffFilter === 'demoted'
                        ? 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30'
                        : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/50'
                        }`}
                    >
                      Đang hạ cấp
                    </Button>
                  </div>
                  <Button
                    onClick={() => setShowCreateStaffModal(true)}
                    className="h-10 rounded-lg px-6 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white border-[#ff3b5c]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm Staff
                  </Button>
                </div>

                {/* Staff List */}
                {staffLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full bg-zinc-900/50 rounded-xl" />
                    ))}
                  </div>
                ) : staffError ? (
                  <div className="text-center py-24">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-400">{staffError}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {staff.map(staffMember => (
                      <Card key={staffMember.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {staffMember.avatarUrl ? (
                                <img src={staffMember.avatarUrl} alt={staffMember.username} className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-800" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-800">
                                  <User className="w-6 h-6 text-zinc-500" />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-white font-medium">{staffMember.displayName || staffMember.username}</h3>
                                  <span className="text-xs px-2 py-0.5 bg-[#ff3b5c]/20 text-[#ff3b5c] rounded">Staff</span>
                                  {(staffMember.isDemoted || staffMember.isDemoted === null) && (
                                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">Đang hạ cấp</span>
                                  )}
                                </div>
                                <p className="text-zinc-500 text-sm">@{staffMember.username}</p>
                                <div className="text-zinc-500 text-xs mt-1">{staffMember.email}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {(staffMember.isDemoted || staffMember.isDemoted === null) ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handlePromoteStaff(staffMember.username)}
                                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30 h-9 rounded-lg"
                                  >
                                    Thăng cấp
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleDeleteStaffAccount(staffMember.username)}
                                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30 h-9 rounded-lg"
                                  >
                                    Xóa tài khoản
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleDemoteStaff(staffMember.username)}
                                  className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                                >
                                  Hạ cấp
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {staff.length === 0 && !staffLoading && (
                      <div className="text-center py-24">
                        <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                          <Shield className="w-8 h-8 text-zinc-600" />
                        </div>
                        <p className="text-zinc-500 text-sm">Chưa có staff nào</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {analyticsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <Skeleton key={i} className="h-32 w-full bg-zinc-900/50 rounded-xl" />
                    ))}
                  </div>
                ) : analyticsError ? (
                  <div className="text-center py-24">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-400">{analyticsError}</p>
                  </div>
                ) : analytics ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Eye className="w-5 h-5 text-blue-500" />
                            </div>
                          </div>
                          <div className="text-2xl text-white font-medium mb-1">
                            {formatCount(analytics.totalViews.current)}
                          </div>
                          <div className="text-sm text-zinc-500 mb-2">Tổng lượt xem</div>
                          <div className={`text-xs ${analytics.totalViews.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {analytics.totalViews.change >= 0 ? '+' : ''}{analytics.totalViews.change}% so với tháng trước
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                              <Play className="w-5 h-5 text-purple-500" />
                            </div>
                          </div>
                          <div className="text-2xl text-white font-medium mb-1">
                            {formatCount(analytics.videosUploaded.current)}
                          </div>
                          <div className="text-sm text-zinc-500 mb-2">Videos đã tải lên</div>
                          <div className={`text-xs ${analytics.videosUploaded.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {analytics.videosUploaded.change >= 0 ? '+' : ''}{analytics.videosUploaded.change}% so với tháng trước
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-green-500" />
                            </div>
                          </div>
                          <div className="text-2xl text-white font-medium mb-1">
                            {formatCount(analytics.activeUsers.current)}
                          </div>
                          <div className="text-sm text-zinc-500 mb-2">Người dùng hoạt động</div>
                          <div className={`text-xs ${analytics.activeUsers.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {analytics.activeUsers.change >= 0 ? '+' : ''}{analytics.activeUsers.change}% so với tháng trước
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-yellow-500" />
                            </div>
                          </div>
                          <div className="text-2xl text-white font-medium mb-1">
                            {formatWatchTime(analytics.averageWatchTime.current)}
                          </div>
                          <div className="text-sm text-zinc-500 mb-2">Thời gian xem TB</div>
                          <div className={`text-xs ${analytics.averageWatchTime.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {analytics.averageWatchTime.change >= 0 ? '+' : ''}{analytics.averageWatchTime.change}% so với tháng trước
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-[#ff3b5c]/10 flex items-center justify-center">
                              <AlertTriangle className="w-5 h-5 text-[#ff3b5c]" />
                            </div>
                          </div>
                          <div className="text-2xl text-white font-medium mb-1">{activeReports}</div>
                          <div className="text-sm text-zinc-500 mb-2">Báo cáo chờ xử lý</div>
                          <div className="text-xs text-red-400">Cần xử lý</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                              <Zap className="w-5 h-5 text-orange-500" />
                            </div>
                          </div>
                          <div className="text-2xl text-white font-medium mb-1">
                            {analytics.engagementRate.current.toFixed(1)}%
                          </div>
                          <div className="text-sm text-zinc-500 mb-2">Tỷ lệ tương tác</div>
                          <div className={`text-xs ${analytics.engagementRate.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {analytics.engagementRate.change >= 0 ? '+' : ''}{analytics.engagementRate.change}% so với tháng trước
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                      <CardHeader className="border-b border-zinc-900/50">
                        <CardTitle className="text-white text-lg">Top Videos</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        {analytics.topVideos.length > 0 ? (
                          <div className="space-y-3">
                            {analytics.topVideos.map((video, index) => (
                              <div key={video.id} className="flex items-center gap-4 p-3 bg-zinc-900/30 rounded-lg">
                                <div className="text-zinc-500 font-medium text-sm w-6">#{index + 1}</div>
                                <div className="w-24 h-16 bg-zinc-900/50 rounded-lg overflow-hidden flex-shrink-0">
                                  {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                      <Play className="w-6 h-6 text-zinc-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-white text-sm font-medium truncate">{video.title}</h4>
                                  <p className="text-zinc-500 text-xs">@{video.uploader.username}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-white font-medium">{video.views.toLocaleString()}</div>
                                  <div className="text-zinc-500 text-xs">lượt xem</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <p className="text-zinc-500 text-sm">Chưa có video nào</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : null}
              </div>
            )}

            {/* System Logs Tab */}
            {activeTab === 'system-logs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">Lịch sử Hệ thống</h2>
                  <Button
                    onClick={fetchSystemLogs}
                    className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Làm mới
                  </Button>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={() => setSystemLogsFilter('all')}
                    className={`h-10 rounded-lg px-4 ${systemLogsFilter === 'all'
                      ? 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30'
                      : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/50'
                      }`}
                  >
                    Tất cả
                  </Button>
                  <Button
                    onClick={() => setSystemLogsFilter('user')}
                    className={`h-10 rounded-lg px-4 ${systemLogsFilter === 'user'
                      ? 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30'
                      : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/50'
                      }`}
                  >
                    Quản lý Người dùng
                  </Button>
                  <Button
                    onClick={() => setSystemLogsFilter('staff')}
                    className={`h-10 rounded-lg px-4 ${systemLogsFilter === 'staff'
                      ? 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30'
                      : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/50'
                      }`}
                  >
                    Quản lý Staff
                  </Button>
                  <Button
                    onClick={() => setSystemLogsFilter('maintenance')}
                    className={`h-10 rounded-lg px-4 ${systemLogsFilter === 'maintenance'
                      ? 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30'
                      : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/50'
                      }`}
                  >
                    Bảo trì Hệ thống
                  </Button>
                  <Button
                    onClick={() => setSystemLogsFilter('settings')}
                    className={`h-10 rounded-lg px-4 ${systemLogsFilter === 'settings'
                      ? 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30'
                      : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/50'
                      }`}
                  >
                    Cài đặt
                  </Button>
                </div>

                {systemLogsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full bg-zinc-900/50 rounded-xl" />
                    ))}
                  </div>
                ) : systemLogsError ? (
                  <div className="text-center py-24">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-400">{systemLogsError}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {systemLogs.map(log => (
                      <Card key={log.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Activity className="w-4 h-4 text-[#ff3b5c]" />
                                <h4 className="text-white font-medium">{log.action}</h4>
                                <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                                  {log.user}
                                </span>
                              </div>
                              <p className="text-zinc-400 text-sm mb-1">{log.details}</p>
                              <p className="text-zinc-600 text-xs">
                                {new Date(log.timestamp).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {systemLogs.length === 0 && !systemLogsLoading && (
                      <div className="text-center py-24">
                        <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
                          <Activity className="w-8 h-8 text-zinc-600" />
                        </div>
                        <p className="text-zinc-500 text-sm">Chưa có hoạt động nào</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* System Maintenance Mode */}
                <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-900/50">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Power className="w-5 h-5 text-yellow-500" />
                      Bảo trì hệ thống
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">Bật chế độ bảo trì hệ thống</h4>
                        <p className="text-zinc-500 text-sm">
                          Khi bật, người dùng thường và Staff sẽ không thể truy cập ứng dụng. Chỉ Admin vẫn có thể đăng nhập.
                        </p>
                      </div>
                      <Button
                        onClick={handleToggleMaintenance}
                        className={`ml-4 h-11 rounded-lg px-6 ${maintenanceMode
                          ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30'
                          : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30'
                          }`}
                      >
                        {maintenanceMode ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Tắt Bảo trì
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-2" />
                            Bật Bảo trì
                          </>
                        )}
                      </Button>
                    </div>
                    {maintenanceMode && (
                      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-500 text-sm">Hệ thống đang ở chế độ bảo trì (chỉ Admin)</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Service Maintenance Mode */}
                <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-900/50">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Power className="w-5 h-5 text-blue-500" />
                      Bảo trì dịch vụ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">Bật chế độ bảo trì dịch vụ</h4>
                        <p className="text-zinc-500 text-sm">
                          Khi bật, Admin và Staff vẫn có thể truy cập ứng dụng. Chỉ người dùng thường sẽ không thể truy cập.
                        </p>
                      </div>
                      <Button
                        onClick={handleToggleServiceMaintenance}
                        className={`ml-4 h-11 rounded-lg px-6 ${serviceMaintenanceMode
                          ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30'
                          : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30'
                          }`}
                      >
                        {serviceMaintenanceMode ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Tắt Bảo trì
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-2" />
                            Bật Bảo trì
                          </>
                        )}
                      </Button>
                    </div>
                    {serviceMaintenanceMode && (
                      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-blue-500" />
                        <span className="text-blue-500 text-sm">Dịch vụ đang ở chế độ bảo trì (Admin và Staff vẫn truy cập được)</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* General Settings */}
                <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-900/50">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5 text-[#ff3b5c]" />
                      Cài đặt chung
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {generalSettingsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-11 w-full bg-zinc-900/50 rounded-lg" />
                        <Skeleton className="h-11 w-full bg-zinc-900/50 rounded-lg" />
                        <Skeleton className="h-11 w-full bg-zinc-900/50 rounded-lg" />
                      </div>
                    ) : generalSettingsError ? (
                      <div className="text-center py-8">
                        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-red-400 text-sm">{generalSettingsError}</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label className="text-zinc-400 mb-2 block text-sm">Tên ứng dụng</Label>
                          <Input
                            value={generalSettingsForm.siteName}
                            onChange={(e) => setGeneralSettingsForm({ ...generalSettingsForm, siteName: e.target.value })}
                            className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                            placeholder="Nhập tên ứng dụng"
                          />
                        </div>
                        <div>
                          <Label className="text-zinc-400 mb-2 block text-sm">Giới hạn upload (MB)</Label>
                          <Input
                            type="number"
                            value={generalSettingsForm.maxUploadSizeMB}
                            onChange={(e) => setGeneralSettingsForm({ ...generalSettingsForm, maxUploadSizeMB: parseInt(e.target.value) || 0 })}
                            className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                            placeholder="Nhập giới hạn upload (MB)"
                            min="1"
                            max="10000"
                          />
                        </div>
                        <div>
                          <Label className="text-zinc-400 mb-2 block text-sm">Thời lượng video tối đa (giây)</Label>
                          <Input
                            type="number"
                            value={generalSettingsForm.maxVideoDurationSeconds}
                            onChange={(e) => setGeneralSettingsForm({ ...generalSettingsForm, maxVideoDurationSeconds: parseInt(e.target.value) || 0 })}
                            className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                            placeholder="Nhập thời lượng tối đa (giây)"
                            min="1"
                            max="86400"
                          />
                        </div>
                        <Button
                          onClick={handleSaveGeneralSettings}
                          disabled={generalSettingsSaving}
                          className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-11 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generalSettingsSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Lưu thay đổi
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <AdminProfile />
            )}
          </div>
        </div>
      </div>

      {/* Ban User Modal */}
      <BanUserModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        username={banUsername}
        banDuration={banDuration}
        setBanDuration={setBanDuration}
        banReason={banReason}
        setBanReason={setBanReason}
        onConfirm={handleBanUser}
      />

      {/* Confirm Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-xl w-full max-w-md mx-4 border border-zinc-800 shadow-2xl">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-white text-lg font-medium">{confirmAction.title}</h3>
            </div>
            <div className="p-6">
              <p className="text-zinc-400 text-sm whitespace-pre-line">{confirmAction.message}</p>
            </div>
            <div className="flex gap-3 p-6 border-t border-zinc-800">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-zinc-800 text-white py-3 rounded-lg hover:bg-zinc-700 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className="flex-1 text-white py-3 rounded-lg transition-all font-medium"
                style={{ backgroundColor: confirmAction.confirmColor }}
                onMouseEnter={(e) => {
                  const color = confirmAction.confirmColor;
                  e.currentTarget.style.backgroundColor = color === '#ff3b5c' ? '#e6315a' : color;
                }}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = confirmAction.confirmColor}
              >
                {confirmAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreateStaffModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-xl w-full max-w-md mx-4 border border-zinc-800 shadow-2xl">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#ff3b5c]/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#ff3b5c]" />
                </div>
                <h3 className="text-white text-lg font-medium">Tạo tài khoản Staff mới</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-zinc-400 text-sm mb-2 block">Username</Label>
                <Input
                  value={newStaffData.username}
                  onChange={(e) => setNewStaffData({ ...newStaffData, username: e.target.value })}
                  placeholder="Nhập username..."
                  className="bg-zinc-800/50 border-zinc-700 text-white h-11 rounded-lg focus:border-[#ff3b5c]/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newStaffData.username.trim() && newStaffData.password.trim()) {
                      handleCreateStaff();
                      setShowCreateStaffModal(false);
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-sm mb-2 block">
                  Mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    value={newStaffData.password}
                    onChange={(e) => {
                      const password = e.target.value;
                      setNewStaffData({ ...newStaffData, password });
                      if (passwordTouched) {
                        setPasswordError(validatePassword(password));
                      }
                    }}
                    onBlur={() => {
                      setPasswordTouched(true);
                      setPasswordError(validatePassword(newStaffData.password));
                    }}
                    placeholder="Nhập mật khẩu..."
                    type="password"
                    className={`bg-zinc-800/50 border text-white h-11 rounded-lg focus:border-[#ff3b5c]/50 pr-10 ${passwordError && passwordTouched ? 'border-red-500' : 'border-zinc-700'
                      }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newStaffData.username.trim() && newStaffData.password.trim()) {
                        handleCreateStaff();
                        setShowCreateStaffModal(false);
                      }
                    }}
                  />
                  {passwordTouched && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {passwordError ? (
                        <span className="text-red-500 text-lg">❌</span>
                      ) : newStaffData.password.length >= 8 ? (
                        <span className="text-green-500 text-lg">✅</span>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Helper text */}
                <p className={`text-xs mt-1.5 ${passwordError && passwordTouched ? 'text-red-400' : 'text-zinc-500'
                  }`}>
                  {passwordError && passwordTouched ? passwordError : 'Mật khẩu phải từ 8-128 ký tự'}
                </p>
              </div>
              <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-3">
                <p className="text-zinc-500 text-xs leading-relaxed">
                  💡 Tài khoản staff sẽ được tạo với email tự động: <span className="text-[#ff3b5c]">{newStaffData.username || 'username'}@staff.clipiq.local</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-zinc-800">
              <button
                onClick={() => {
                  setShowCreateStaffModal(false);
                  setNewStaffData({ username: '', password: '' });
                  setPasswordError('');
                  setPasswordTouched(false);
                }}
                className="flex-1 bg-zinc-800 text-white py-3 rounded-lg hover:bg-zinc-700 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  handleCreateStaff();
                  setShowCreateStaffModal(false);
                }}
                disabled={!newStaffData.username.trim() || !newStaffData.password.trim()}
                className="flex-1 bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white py-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tạo tài khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}