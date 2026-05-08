import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { DashboardOutlined, AppstoreOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scenarios from './pages/Scenarios';
import Reports from './pages/Reports';
import Users from './pages/Users';

function Shell() {
  const nav = useNavigate();
  const items = [
    { key: '/', icon: <DashboardOutlined />, label: '数据概览' },
    { key: '/scenarios', icon: <AppstoreOutlined />, label: '场景管理' },
    { key: '/reports', icon: <FileTextOutlined />, label: '练习报告' },
    { key: '/users', icon: <UserOutlined />, label: '用户管理' }
  ];
  return <Layout style={{ minHeight: '100vh' }}>
    <Layout.Sider><div className="logo">AI Coach</div><Menu theme="dark" mode="inline" items={items} onClick={e => nav(e.key)} /></Layout.Sider>
    <Layout>
      <Layout.Header className="header"><Button onClick={() => { localStorage.clear(); nav('/login'); }}>退出</Button></Layout.Header>
      <Layout.Content className="content"><Routes><Route path="/" element={<Dashboard />} /><Route path="/scenarios" element={<Scenarios />} /><Route path="/reports" element={<Reports />} /><Route path="/users" element={<Users />} /></Routes></Layout.Content>
    </Layout>
  </Layout>;
}
function Guard({ children }: { children: React.ReactNode }) { return localStorage.getItem('accessToken') ? <>{children}</> : <Navigate to="/login" />; }
export default function App() { return <BrowserRouter><Routes><Route path="/login" element={<Login />} /><Route path="/*" element={<Guard><Shell /></Guard>} /></Routes></BrowserRouter>; }
