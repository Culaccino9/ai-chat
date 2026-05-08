import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({ where: { code: 'demo' }, update: {}, create: { code: 'demo', name: '演示企业' } });
  const passwordHash = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.upsert({ where: { email: 'admin@example.com' }, update: {}, create: { tenantId: tenant.id, email: 'admin@example.com', passwordHash, name: '管理员', role: 'LEARNING_ADMIN', orgUnit: '培训中心' } });
  const learner = await prisma.user.upsert({ where: { email: 'learner@example.com' }, update: {}, create: { tenantId: tenant.id, email: 'learner@example.com', passwordHash, name: '张三', role: 'LEARNER', orgUnit: '华东销售一组' } });
  const persona = await prisma.persona.create({ data: { tenantId: tenant.id, name: '犹豫型客户', style: 'skeptical', goal: '压价并对比竞品', prompt: '你是一名谨慎客户，会持续追问价格、效果和落地风险。', tags: JSON.stringify(['销售','异议处理']) } });
  const rubric = await prisma.rubric.create({ data: { tenantId: tenant.id, name: '销售异议处理评分', passScore: 70, dimensions: JSON.stringify([
    { code: 'fluency', name: '表达流畅度', weight: 20 },
    { code: 'logic', name: '逻辑结构', weight: 25 },
    { code: 'professional', name: '专业度', weight: 25 },
    { code: 'objection_handling', name: '异议处理', weight: 20 },
    { code: 'closing', name: '促成动作', weight: 10 }
  ]) } });
  const scenario = await prisma.scenario.create({ data: { tenantId: tenant.id, title: '零售门店价格异议处理', industry: 'retail', jobFamily: 'sales', description: '模拟客户对价格提出异议，学员需要完成需求确认、价值说明和促成下一步。', difficulty: 3, estMinutes: 10, modes: JSON.stringify(['FREE_DIALOGUE','FIXED_DIALOGUE']), languages: JSON.stringify(['zh-CN','en-US']), status: 'PUBLISHED', personaId: persona.id, rubricId: rubric.id, knowledge: JSON.stringify([{ title: '门店价格异议 FAQ', type: 'document' }]) } });
  const assignment = await prisma.assignment.create({ data: { title: '新人销售通关任务', description: '完成价格异议处理陪练并达到 70 分。', passScore: 70, status: 'PUBLISHED', users: { create: [{ userId: learner.id }] }, scenarios: { create: [{ scenarioId: scenario.id }] } } });
  console.log({ tenant: tenant.code, admin: admin.email, learner: learner.email, scenario: scenario.title, assignment: assignment.title });
}
main().finally(() => prisma.$disconnect());
