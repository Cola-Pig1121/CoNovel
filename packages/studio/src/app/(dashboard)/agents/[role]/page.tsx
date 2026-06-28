'use client';

import { api } from '@/lib/api';

import { useState, useEffect, useRef, use } from 'react';

const AGENT_INFO: Record<string, { name: string; nameZh: string; description: string; tasks: string[] }> = {
  architect: { name: 'Architect', nameZh: '故事架构师', description: '负责大纲构建、情节设计、世界观架构', tasks: ['创建大纲', '设计世界观', '规划卷章结构', '分析情节节奏'] },
  writer: { name: 'Writer', nameZh: '写作特工', description: '负责章节正文创作', tasks: ['创作章节', '改写段落', '续写故事', '调整文风'] },
  'character-intelligence': { name: 'Character Intelligence', nameZh: '角色智能体', description: '模拟角色思维推理', tasks: ['推理角色反应', '模拟对话', '分析性格', '预测行为'] },
  reviewer: { name: 'Reviewer', nameZh: '审阅官', description: '多维度质量审阅', tasks: ['审阅章节', '检查一致性', '评估节奏', '分析角色'] },
  editor: { name: 'Editor', nameZh: '编辑', description: '文字润色、结构调整', tasks: ['润色文字', '调整结构', '优化表达', '精简段落'] },
  observer: { name: 'Observer', nameZh: '观察者', description: '监控叙事事件', tasks: ['记录事件', '追踪角色', '监控伏笔', '整理时间线'] },
  'character-designer': { name: 'Character Designer', nameZh: '角色设计师', description: '角色档案设计', tasks: ['设计角色', '构建关系', '规划成长', '补充背景'] },
  'style-analyzer': { name: 'Style Analyzer', nameZh: '风格分析师', description: '风格指纹分析', tasks: ['分析风格', '对比差异', '校准文风', '提取特征'] },
  'fact-checker': { name: 'Fact Checker', nameZh: '事实核查官', description: '事实一致性检查', tasks: ['核查事实', '验证设定', '检查时间线', '对比前后文'] },
  continuity: { name: 'Continuity', nameZh: '连续性检查官', description: '跨章节连续性', tasks: ['检查衔接', '验证连续性', '追踪状态', '对比前后章'] },
  'pacing-controller': { name: 'Pacing Controller', nameZh: '节奏控制官', description: '节奏曲线控制', tasks: ['分析节奏', '调整张力', '规划节拍', '平衡缓急'] },
  foreshadowing: { name: 'Foreshadowing', nameZh: '伏笔管理官', description: '伏笔追踪管理', tasks: ['植入伏笔', '推进伏笔', '回收伏笔', '检查逾期'] },
  'de-ai-editor': { name: 'De-AI Editor', nameZh: '去AI味编辑', description: '消除AI写作痕迹', tasks: ['检测AI痕迹', '替换禁词', '打破句式', '润色自然度'] },
  radar: { name: 'Radar', nameZh: '趋势雷达', description: '市场趋势扫描', tasks: ['扫描趋势', '分析题材', '研究读者', '竞品分析'] },
  reflector: { name: 'Reflector', nameZh: '反思官', description: '质量反思改进', tasks: ['反思章节', '总结经验', '改进建议', '进化追踪'] },
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AgentDetailPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = use(params);
  const agent = AGENT_INFO[role] || { name: role, nameZh: role, description: '', tasks: [] };

  const [mode, setMode] = useState<'task' | 'chat'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`/api/agents/${role}/conversations`).then(data => {
      setMessages(data.messages || []);
    });
  }, [role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    // Add user message optimistically
    const userMsg: Message = { id: 'temp-' + Date.now(), role: 'user', content, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const data = await api.post(`/api/agents/${role}/conversations`, { content });
      setMessages(prev => [...prev.filter(m => m.id !== userMsg.id), data.userMessage, data.assistantMessage]);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    }
    setSending(false);
  };

  const handleTask = async (task: string) => {
    setSelectedTask(task);
    setInput(`请执行任务: ${task}`);
    setMode('chat');
  };

  const agents = Object.entries(AGENT_INFO);

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Agent List Sidebar */}
      <div className="w-56 border-r border-border overflow-y-auto flex-shrink-0 bg-background">
        <div className="p-4 border-b border-border">
          <p className="label-editorial text-muted">Agent</p>
        </div>
        <div className="py-2">
          {agents.map(([r, info]) => (
            <a
              key={r}
              href={`/agents/${r}`}
              className={`block px-4 py-2 text-sm transition-colors ${r === role ? 'bg-foreground text-background' : 'hover:bg-foreground/5'}`}
            >
              {info.nameZh}
            </a>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Agent Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-xl">{agent.nameZh}</h1>
              <p className="text-sm text-muted mt-1">{agent.description}</p>
            </div>
            <div className="flex gap-1 border border-border">
              <button onClick={() => setMode('task')} className={`px-4 py-2 text-xs transition-colors ${mode === 'task' ? 'bg-foreground text-background' : ''}`}>任务</button>
              <button onClick={() => setMode('chat')} className={`px-4 py-2 text-xs transition-colors ${mode === 'chat' ? 'bg-foreground text-background' : ''}`}>对话</button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {mode === 'task' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <p className="label-editorial text-muted mb-4">可用任务</p>
            <div className="grid grid-cols-2 gap-3">
              {agent.tasks.map(task => (
                <button
                  key={task}
                  onClick={() => handleTask(task)}
                  className="card-editorial text-left hover:border-foreground"
                >
                  <p className="font-sans text-sm">{task}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-muted mb-2">开始与 {agent.nameZh} 对话</p>
                  <p className="text-xs text-muted">输入消息或切换到「任务」模式选择预定义任务</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-foreground text-background'
                      : 'border border-border'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-background/60' : 'text-muted'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="border border-border px-4 py-3 text-sm text-muted">思考中...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border px-6 py-4">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  className="input-editorial flex-1 resize-none"
                  rows={2}
                  placeholder={`向${agent.nameZh}发送消息...`}
                  disabled={sending}
                />
                <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-editorial-primary self-end px-6">
                  发送
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
