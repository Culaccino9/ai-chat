import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';

export default function KnowledgeCards() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () => api.get('/knowledge-cards').then((r: any) => setItems(r.data));

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ title: '', summary: '', content: '', tags: [], status: 'PUBLISHED', sortOrder: items.length + 1 });
    setOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    if (editing) {
      await api.patch(`/knowledge-cards/${editing.id}`, v);
      message.success('已更新');
    } else {
      await api.post('/knowledge-cards', v);
      message.success('已创建');
    }
    setOpen(false);
    form.resetFields();
    void load();
  };

  const remove = async (id: string) => {
    await api.delete(`/knowledge-cards/${id}`);
    message.success('已删除');
    void load();
  };

  return (
    <Card title="知识卡片" extra={<Button type="primary" onClick={openCreate}>新增知识卡片</Button>}>
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: '排序', dataIndex: 'sortOrder', width: 80 },
          { title: '标题', dataIndex: 'title' },
          { title: '摘要', dataIndex: 'summary', ellipsis: true },
          { title: '标签', dataIndex: 'tags', render: (tags: string[]) => tags?.map(tag => <Tag key={tag}>{tag}</Tag>) },
          { title: '状态', dataIndex: 'status', render: v => <Tag color={v === 'PUBLISHED' ? 'green' : 'default'}>{v}</Tag> },
          { title: '操作', render: (_, r: any) => (
            <Space>
              <Button onClick={() => openEdit(r)}>编辑</Button>
              <Popconfirm title="确认删除该知识卡片？" onConfirm={() => remove(r.id)}>
                <Button danger>删除</Button>
              </Popconfirm>
            </Space>
          ) }
        ]}
      />
      <Modal title={editing ? '编辑知识卡片' : '新增知识卡片'} open={open} onCancel={() => setOpen(false)} onOk={submit} width={760}>
        <Form form={form} layout="vertical">
          <Space size="large">
            <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input style={{ width: 300 }} /></Form.Item>
            <Form.Item name="sortOrder" label="排序"><InputNumber min={0} /></Form.Item>
            <Form.Item name="status" label="状态"><Select style={{ width: 160 }} options={[{ label: '发布', value: 'PUBLISHED' }, { label: '草稿', value: 'DRAFT' }]} /></Form.Item>
          </Space>
          <Form.Item name="summary" label="摘要"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="tags" label="标签"><Select mode="tags" placeholder="输入标签后回车" /></Form.Item>
          <Form.Item name="content" label="正文" rules={[{ required: true }]}><Input.TextArea rows={10} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
