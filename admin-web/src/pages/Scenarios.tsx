import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';
const modes = ['FREE_DIALOGUE','FIXED_DIALOGUE','PPT_SPEECH','PRODUCT_3D','SCRIPT_RECITAL'];
export default function Scenarios() {
  const [items, setItems] = useState<any[]>([]); const [open, setOpen] = useState(false); const [form] = Form.useForm();
  const load = () => api.get('/scenarios?status=').then((r: any) => setItems(r.data));
  useEffect(load, []);
  const submit = async () => { const v = await form.validateFields(); await api.post('/scenarios', { ...v, languages: ['zh-CN'] }); message.success('已创建'); setOpen(false); form.resetFields(); load(); };
  const publish = async (id: string) => { await api.post(`/scenarios/${id}/publish`); message.success('已发布'); load(); };
  return <Card title="场景管理" extra={<Button type="primary" onClick={() => setOpen(true)}>新建场景</Button>}><Table rowKey="id" dataSource={items} columns={[{ title: '标题', dataIndex: 'title' }, { title: '行业', dataIndex: 'industry' }, { title: '岗位', dataIndex: 'jobFamily' }, { title: '模式', dataIndex: 'modes', render: (arr: string[]) => arr?.map(i => <Tag key={i}>{i}</Tag>) }, { title: '状态', dataIndex: 'status', render: v => <Tag color={v==='PUBLISHED'?'green':'default'}>{v}</Tag> }, { title: '操作', render: (_, r: any) => <Space><Button onClick={() => publish(r.id)}>发布</Button></Space> }]} /><Modal title="新建场景" open={open} onCancel={() => setOpen(false)} onOk={submit}><Form form={form} layout="vertical" initialValues={{ difficulty: 3, estMinutes: 10, modes: ['FREE_DIALOGUE'] }}><Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="industry" label="行业" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="jobFamily" label="岗位" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="description" label="描述"><Input.TextArea /></Form.Item><Form.Item name="difficulty" label="难度"><InputNumber min={1} max={5} /></Form.Item><Form.Item name="estMinutes" label="预计分钟"><InputNumber min={1} /></Form.Item><Form.Item name="modes" label="模式"><Select mode="multiple" options={modes.map(v => ({ label: v, value: v }))} /></Form.Item></Form></Modal></Card>;
}
