import { Card, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function Users() { const [items,setItems]=useState<any[]>([]); useEffect(()=>{api.get('/admin/users').then((r:any)=>setItems(r.data));},[]); return <Card title="用户管理"><Table rowKey="id" dataSource={items} columns={[{title:'姓名',dataIndex:'name'},{title:'邮箱',dataIndex:'email'},{title:'角色',dataIndex:'role',render:v=><Tag>{v}</Tag>},{title:'组织',dataIndex:'orgUnit'}]} /></Card>; }
