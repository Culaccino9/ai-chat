import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';

const modes = ['FREE_DIALOGUE', 'FIXED_DIALOGUE', 'PPT_SPEECH', 'PRODUCT_3D', 'SCRIPT_RECITAL'];

export default function Scenarios() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () => api.get('/scenarios?status=').then((r: any) => setItems(r.data));

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ difficulty: 3, estMinutes: 10, modes: ['FREE_DIALOGUE'], status: 'PUBLISHED' });
    setOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload = { ...v, languages: ['zh-CN'], knowledge: [] };
    if (editing) {
      await api.patch(`/scenarios/${editing.id}`, payload);
      message.success('已更新');
    } else {
      await api.post('/scenarios', payload);
      message.success('已创建');
    }
    setOpen(false);
    form.resetFields();
    void load();
  };

  const remove = async (id: string) => {
    await api.delete(`/scenarios/${id}`);
    message.success('已删除');
    void load();
  };

  const archive = async (id: string) => {
    await api.post(`/scenarios/${id}/archive`);
    message.success('已归档');
    void load();
  };

  return (
    <Card title="场景管理" extra={<Button type="primary" onClick={openCreate}>新增场景</Button>}>
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: '标题', dataIndex: 'title' },
          { title: '行业', dataIndex: 'industry' },
          { title: '岗位', dataIndex: 'jobFamily' },
          { title: '状态', dataIndex: 'status', render: v => <Tag color={v === 'PUBLISHED' ? 'green' : 'default'}>{v}</Tag> },
          { title: '类目数', render: (_, r: any) => r.categories?.length || 0 },
          { title: '操作', render: (_, r: any) => (
            <Space>
              <Button onClick={() => openEdit(r)}>编辑</Button>
              <Button onClick={() => archive(r.id)}>归档</Button>
              <Popconfirm title="确认删除该场景？" onConfirm={() => remove(r.id)}>
                <Button danger>删除</Button>
              </Popconfirm>
            </Space>
          ) }
        ]}
      />
      <Modal title={editing ? '编辑场景' : '新增场景'} open={open} onCancel={() => setOpen(false)} onOk={submit} width={720}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="场景名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="场景描述"><Input.TextArea rows={3} /></Form.Item>
          <Space size="large">
            <Form.Item name="industry" label="行业" rules={[{ required: true }]}><Input style={{ width: 180 }} /></Form.Item>
            <Form.Item name="jobFamily" label="岗位" rules={[{ required: true }]}><Input style={{ width: 180 }} /></Form.Item>
            <Form.Item name="difficulty" label="难度"><InputNumber min={1} max={5} /></Form.Item>
            <Form.Item name="estMinutes" label="预计分钟"><InputNumber min={1} /></Form.Item>
          </Space>
          <Form.Item name="modes" label="模式"><Select mode="multiple" options={modes.map(v => ({ label: v, value: v }))} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
