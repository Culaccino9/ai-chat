import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const emptyScript = { title: '', tips: '', script: '' };

export default function PracticeCategories() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [scenarioId, setScenarioId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const scenarioOptions = useMemo(() => scenarios.map(s => ({ label: s.title, value: s.id })), [scenarios]);

  const loadScenarios = async () => {
    const r: any = await api.get('/scenarios?status=');
    setScenarios(r.data);
    const nextId = scenarioId || r.data[0]?.id || '';
    setScenarioId(nextId);
    if (nextId) await loadCategories(nextId);
  };

  const loadCategories = async (id = scenarioId) => {
    if (!id) return setItems([]);
    const r: any = await api.get(`/scenarios/${id}/categories`);
    setItems(r.data);
  };

  useEffect(() => {
    void loadScenarios();
  }, []);

  const changeScenario = (id: string) => {
    setScenarioId(id);
    void loadCategories(id);
  };

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ title: '', description: '', prompt: '', sortOrder: items.length + 1, status: 'PUBLISHED', scripts: [emptyScript] });
    setOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({ ...record, scripts: record.scripts?.length ? record.scripts : [emptyScript] });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    if (editing) {
      await api.patch(`/scenarios/categories/${editing.id}`, v);
      message.success('已更新');
    } else {
      await api.post(`/scenarios/${scenarioId}/categories`, v);
      message.success('已创建');
    }
    setOpen(false);
    form.resetFields();
    void loadCategories();
  };

  const remove = async (id: string) => {
    await api.delete(`/scenarios/categories/${id}`);
    message.success('已删除');
    void loadCategories();
  };

  return (
    <Card
      title="练习类目"
      extra={<Space><Select style={{ width: 260 }} value={scenarioId} options={scenarioOptions} onChange={changeScenario} /><Button type="primary" disabled={!scenarioId} onClick={openCreate}>新增类目</Button></Space>}
    >
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: '排序', dataIndex: 'sortOrder', width: 80 },
          { title: '类目名称', dataIndex: 'title' },
          { title: '初始提示', dataIndex: 'description', ellipsis: true },
          { title: '状态', dataIndex: 'status', render: v => <Tag color={v === 'PUBLISHED' ? 'green' : 'default'}>{v}</Tag> },
          { title: '话术段落', render: (_, r: any) => r.scripts?.length || 0 },
          { title: '操作', render: (_, r: any) => (
            <Space>
              <Button onClick={() => openEdit(r)}>编辑</Button>
              <Popconfirm title="确认删除该类目？" onConfirm={() => remove(r.id)}>
                <Button danger>删除</Button>
              </Popconfirm>
            </Space>
          ) }
        ]}
      />
      <Modal title={editing ? '编辑练习类目' : '新增练习类目'} open={open} onCancel={() => setOpen(false)} onOk={submit} width={860}>
        <Form form={form} layout="vertical">
          <Space size="large">
            <Form.Item name="title" label="类目名称" rules={[{ required: true }]}><Input style={{ width: 240 }} placeholder="基础沟通" /></Form.Item>
            <Form.Item name="sortOrder" label="排序"><InputNumber min={0} /></Form.Item>
            <Form.Item name="status" label="状态"><Select style={{ width: 160 }} options={[{ label: '启用', value: 'PUBLISHED' }, { label: '停用', value: 'DISABLED' }]} /></Form.Item>
          </Space>
          <Form.Item name="description" label="会话初始提示"><Input.TextArea rows={2} placeholder="进入该类目后，小程序会展示给用户的提示" /></Form.Item>
          <Form.Item name="prompt" label="大模型对练判定提示"><Input.TextArea rows={4} placeholder="告诉大模型本类目要围绕什么目标、问题和评分重点展开" /></Form.Item>
          <Form.List name="scripts">
            {(fields, { add, remove }) => (
              <>
                <div className="form-section-title">示例话术内容</div>
                {fields.map(field => (
                  <Card key={field.key} size="small" style={{ marginBottom: 12 }}>
                    <Space align="start">
                      <Form.Item name={[field.name, 'title']} label="标题"><Input style={{ width: 160 }} /></Form.Item>
                      <Form.Item name={[field.name, 'tips']} label="说明"><Input style={{ width: 240 }} /></Form.Item>
                      <Form.Item name={[field.name, 'script']} label="话术"><Input.TextArea style={{ width: 320 }} rows={3} /></Form.Item>
                      <Button danger onClick={() => remove(field.name)}>删除</Button>
                    </Space>
                  </Card>
                ))}
                <Button onClick={() => add(emptyScript)}>添加话术段落</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
}
