import { Card, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function Reports() { const [items,setItems]=useState<any[]>([]); useEffect(()=>{api.get('/admin/reports').then((r:any)=>setItems(r.data));},[]); return <Card title="练习报告"><Table rowKey="id" dataSource={items} columns={[{title:'学员',dataIndex:['session','user','name']},{title:'场景',dataIndex:['session','scenario','title']},{title:'总分',dataIndex:'overallScore'},{title:'是否通过',dataIndex:'pass',render:v=><Tag color={v?'green':'red'}>{v?'通过':'未通过'}</Tag>},{title:'总结',dataIndex:'summary'}]} /></Card>; }
