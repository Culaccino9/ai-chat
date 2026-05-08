import { Button, Card, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
export default function Login() {
  const nav = useNavigate();
  const onFinish = async (values: any) => {
    try { const res: any = await api.post('/auth/login', values); localStorage.setItem('accessToken', res.data.accessToken); message.success('登录成功'); nav('/'); }
    catch (e: any) { message.error(e.message || '登录失败'); }
  };
  return <div className="login-page"><Card title="AI 陪练管理后台" className="login-card"><Form layout="vertical" initialValues={{ email: 'admin@example.com', password: '123456' }} onFinish={onFinish}><Form.Item name="email" label="邮箱" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="password" label="密码" rules={[{ required: true }]}><Input.Password /></Form.Item><Button type="primary" htmlType="submit" block>登录</Button></Form></Card></div>;
}
