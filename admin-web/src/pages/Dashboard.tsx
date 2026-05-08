import { Card, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function Dashboard() {
  const [data, setData] = useState<any>({ latestSessions: [] });
  useEffect(() => { api.get('/admin/dashboard').then((r: any) => setData(r.data)); }, []);
  return <><div className="card-grid"><Card title="场景数">{data.scenarioCount || 0}</Card><Card title="学员数">{data.learnerCount || 0}</Card><Card title="练习次数">{data.sessionCount || 0}</Card><Card title="平均分">{data.avgScore || 0}</Card></div><Card title="最近练习"><Table rowKey="id" dataSource={data.latestSessions} columns={[{ title: '学员', dataIndex: ['user','name'] }, { title: '场景', dataIndex: ['scenario','title'] }, { title: '状态', dataIndex: 'status', render: v => <Tag>{v}</Tag> }, { title: '得分', render: (_, r: any) => r.report?.overallScore || '-' }]} /></Card></>;
}
