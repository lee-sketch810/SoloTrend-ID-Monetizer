import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BookOpen, 
  Code, 
  Youtube, 
  PenTool, 
  Hash, 
  Save, 
  Trash2, 
  RefreshCw,
  LogIn,
  LogOut,
  ChevronRight,
  Lightbulb,
  X,
  Sparkles,
  ArrowRight,
  Search,
  MessageSquare,
  Copy,
  Presentation,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Package,
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  generateMonetizationIdeas, 
  generateDetailedContent, 
  developIdeaWithFeedback,
  generateNextStepPrompt,
  fetchTrendAnalysis,
  MonetizationIdea,
  TrendAnalysis
} from './services/geminiService';
import { saveIdea, subscribeToIdeas, deleteIdea, IdeaRecord } from './services/ideaService';
import { cn } from './lib/utils';
import { format } from 'date-fns';

const COLORS = ['#5A5A40', '#8E8E70', '#E5E1DA', '#1A1A1A', '#F5F2ED'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<MonetizationIdea[]>([]);
  const [archive, setArchive] = useState<IdeaRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'archive' | 'dashboard'>('generate');
  const [searchTerm, setSearchTerm] = useState('');
  const [expertise, setExpertise] = useState('교수설계, 교육 공학');
  
  // Dashboard State
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  
  // Detail Modal State
  const [selectedIdea, setSelectedIdea] = useState<MonetizationIdea | IdeaRecord | null>(null);
  const [detailedContent, setDetailedContent] = useState<string>('');
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [contentHistory, setContentHistory] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToIdeas(setArchive);
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'dashboard' && !trendAnalysis) {
      handleFetchTrend();
    }
  }, [activeTab]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' && !trendAnalysis && !isDashboardLoading) {
      handleFetchTrend();
    }
  }, [activeTab]);

  const handleLogout = () => signOut(auth);

  const handleGenerate = async () => {
    setLoading(true);
    setGenerationError(null);
    try {
      const result = await generateMonetizationIdeas(
        "1인 지식 창업, AI 자동화, 디지털 콘텐츠, 1인 기업가 수익화 모델",
        searchTerm,
        expertise
      );
      setIdeas(result);
      // Removed automatic handleFetchTrend() to save quota
    } catch (error: any) {
      console.error("Generation failed", error);
      const errorStr = JSON.stringify(error);
      if (error?.message?.includes("429") || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
        setGenerationError("API 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        setGenerationError("아이디어를 생성하는 데 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFetchTrend = async () => {
    setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const analysis = await fetchTrendAnalysis(searchTerm || "1인 지식 창업 수익화");
      setTrendAnalysis(analysis);
    } catch (error: any) {
      console.error("Trend analysis failed", error);
      const errorStr = JSON.stringify(error);
      if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED" || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
        setDashboardError("API 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        setDashboardError("트렌드 데이터를 불러오는 데 실패했습니다.");
      }
    } finally {
      setIsDashboardLoading(false);
    }
  };

  const handleSave = async (idea: MonetizationIdea | IdeaRecord, content?: string) => {
    try {
      await saveIdea({
        ...idea,
        detailedContent: content || detailedContent
      });
      alert("아카이브에 저장되었습니다.");
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  const handleViewDetail = async (idea: MonetizationIdea | IdeaRecord) => {
    setSelectedIdea(idea);
    setDetailedContent('');
    setUserFeedback('');
    setContentHistory([]); // Reset history
    
    // If it's an archived idea and already has detailed content, use it
    if ('detailedContent' in idea && idea.detailedContent) {
      setDetailedContent(idea.detailedContent);
      setIsDetailLoading(false);
      return;
    }

    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const content = await generateDetailedContent(idea as MonetizationIdea);
      setDetailedContent(content);
    } catch (error: any) {
      console.error("Detail generation failed", error);
      const errorStr = JSON.stringify(error);
      if (error?.message?.includes("429") || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
        setDetailError("API 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        setDetailError("상세 내용을 생성하는 데 실패했습니다.");
      }
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDevelopIdea = async () => {
    if (!selectedIdea || !userFeedback.trim()) return;
    
    setIsDeveloping(true);
    setDetailError(null);
    try {
      // Save current content to history before updating
      setContentHistory(prev => [...prev, detailedContent]);
      
      const updatedContent = await developIdeaWithFeedback(selectedIdea as MonetizationIdea, detailedContent, userFeedback);
      setDetailedContent(updatedContent);
      setUserFeedback('');
    } catch (error: any) {
      console.error("Development failed", error);
      const errorStr = JSON.stringify(error);
      if (error?.message?.includes("429") || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
        setDetailError("API 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        setDetailError("아이디어를 고도화하는 데 실패했습니다.");
      }
    } finally {
      setIsDeveloping(false);
    }
  };

  const handleRestorePrevious = () => {
    if (contentHistory.length === 0) return;
    
    const previous = contentHistory[contentHistory.length - 1];
    setDetailedContent(previous);
    setContentHistory(prev => prev.slice(0, -1));
  };

  const handleCopyPrompt = () => {
    if (!selectedIdea || !detailedContent) return;
    
    const prompt = generateNextStepPrompt(selectedIdea, detailedContent);
    navigator.clipboard.writeText(prompt);
    alert("다음 단계 실행을 위한 프롬프트가 복사되었습니다! AI Studio, 전자책 집필, 또는 제미나이에 붙여넣어 사용하세요.");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'App': return <Code className="w-5 h-5" />;
      case 'E-book': return <BookOpen className="w-5 h-5" />;
      case 'YouTube': return <Youtube className="w-5 h-5" />;
      case 'Blog': return <PenTool className="w-5 h-5" />;
      case 'Threads': return <Hash className="w-5 h-5" />;
      case 'Service': return <Users className="w-5 h-5" />;
      case 'Physical': return <Package className="w-5 h-5" />;
      default: return <Lightbulb className="w-5 h-5" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-sm border border-[#E5E1DA] text-center">
          <div className="w-20 h-20 bg-[#5A5A40] rounded-full flex items-center justify-center mx-auto mb-8">
            <TrendingUp className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-serif font-light text-[#1A1A1A] mb-4">SoloTrend</h1>
          <p className="text-[#5A5A40] mb-10 leading-relaxed">
            AI 에이전트 시대, 당신의 완벽한 비서를 위한<br />수익화 아이디어 및 트렌드 아카이브
          </p>
          <button 
            onClick={handleLogin}
            className="w-full bg-[#5A5A40] text-white py-4 rounded-full flex items-center justify-center gap-3 hover:bg-[#4A4A30] transition-all font-medium"
          >
            <LogIn className="w-5 h-5" />
            Google로 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans">
      {/* Navigation */}
      <nav className="border-b border-[#E5E1DA] bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-[#5A5A40] w-6 h-6" />
            <span className="font-serif text-xl tracking-tight">SoloTrend</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex bg-[#F5F2ED] p-1 rounded-full">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === 'dashboard' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8E8E70]"
                )}
              >
                대시보드
              </button>
              <button 
                onClick={() => setActiveTab('generate')}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === 'generate' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8E8E70]"
                )}
              >
                아이디어 도출
              </button>
              <button 
                onClick={() => setActiveTab('archive')}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === 'archive' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8E8E70]"
                )}
              >
                아카이브
              </button>
            </div>
            <button onClick={handleLogout} className="text-[#8E8E70] hover:text-[#5A5A40]">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        {activeTab === 'dashboard' ? (
          <div className="space-y-10">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-serif font-light mb-2">트렌드 대시보드</h2>
                <p className="text-[#8E8E70]">AI 에이전트 및 자동화 관련 실시간 시장 분석 데이터</p>
              </div>
              <button 
                onClick={handleFetchTrend}
                disabled={isDashboardLoading}
                className="bg-[#5A5A40] text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-[#4A4A30] transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isDashboardLoading && "animate-spin")} />
                데이터 갱신
              </button>
            </header>

            {isDashboardLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Activity className="w-12 h-12 text-[#5A5A40] animate-pulse" />
                <p className="text-[#5A5A40] font-serif">실시간 데이터를 분석 중입니다...</p>
              </div>
            ) : dashboardError ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-[#E5E1DA]">
                <Activity className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-[#1A1A1A] font-medium mb-2">{dashboardError}</p>
                <button 
                  onClick={handleFetchTrend}
                  className="text-[#5A5A40] underline underline-offset-4 hover:text-[#1A1A1A] transition-colors"
                >
                  다시 시도하기
                </button>
              </div>
            ) : trendAnalysis ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Hot Keywords Chart */}
                <div className="bg-white p-8 rounded-[32px] border border-[#E5E1DA] shadow-sm">
                  <h3 className="text-xl font-serif mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#5A5A40]" /> 급상승 키워드
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendAnalysis.hotKeywords} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F5F2ED" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="keyword" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#5A5A40' }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#F5F2ED' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="score" fill="#5A5A40" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Platform Distribution Chart */}
                <div className="bg-white p-8 rounded-[32px] border border-[#E5E1DA] shadow-sm">
                  <h3 className="text-xl font-serif mb-6 flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-[#5A5A40]" /> 플랫폼별 점유율
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={trendAnalysis.platformDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="mentions"
                          nameKey="platform"
                        >
                          {trendAnalysis.platformDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="md:col-span-2 bg-[#5A5A40] text-white p-10 rounded-[32px] shadow-lg relative overflow-hidden">
                  <Sparkles className="absolute top-6 right-6 w-12 h-12 opacity-20" />
                  <h3 className="text-2xl font-serif mb-4">트렌드 인사이트</h3>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-lg leading-relaxed opacity-90">{trendAnalysis.summary}</p>
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between text-sm opacity-60">
                    <span>마지막 업데이트: {trendAnalysis.lastUpdated}</span>
                    <button 
                      onClick={() => setActiveTab('generate')}
                      className="bg-white text-[#5A5A40] px-6 py-2 rounded-full font-medium hover:bg-opacity-90 transition-all"
                    >
                      아이디어 도출하러 가기
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : activeTab === 'generate' ? (
          <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-4xl font-serif font-light mb-2">트렌드 분석</h2>
                <p className="text-[#8E8E70] mb-6">AI 에이전트의 실행력을 기반으로 한 새로운 수익화 기회를 분석합니다.</p>
                
                <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E70]" />
                    <input 
                      type="text" 
                      placeholder="검색어 입력 (예: 노션 템플릿, AI 챗봇...)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-[#E5E1DA] rounded-full py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
                    />
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E70] flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="나의 전문성 (예: 교수설계, 마케팅...)"
                      value={expertise}
                      onChange={(e) => setExpertise(e.target.value)}
                      className="w-full bg-white border border-[#E5E1DA] rounded-full py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
                    />
                  </div>
                </div>

                {generationError && (
                  <div className="max-w-xl p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 mt-4">
                    <Activity className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{generationError}</p>
                  </div>
                )}
              </div>
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="bg-[#5A5A40] text-white px-8 py-4 rounded-full flex items-center gap-3 hover:bg-[#4A4A30] transition-all disabled:opacity-50 h-fit"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                실시간 트렌드 분석 시작
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ideas.map((idea, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleViewDetail(idea)}
                  className="bg-white rounded-[32px] p-8 border border-[#E5E1DA] shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="bg-[#F5F2ED] p-3 rounded-2xl text-[#5A5A40]">
                      {getCategoryIcon(idea.category)}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(idea);
                      }}
                      className="text-[#8E8E70] hover:text-[#5A5A40] p-2 z-10"
                    >
                      <Save className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="mb-2 text-xs font-bold text-[#5A5A40] uppercase tracking-widest">{idea.category}</div>
                  <h3 className="text-2xl font-serif mb-4 leading-tight group-hover:text-[#5A5A40] transition-colors">{idea.title}</h3>
                  <p className="text-[#5A5A40] text-sm mb-6 leading-relaxed line-clamp-3">{idea.description}</p>
                  
                  <div className="pt-6 border-t border-[#F5F2ED] space-y-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-[#8E8E70] mb-1">트렌드 근거</div>
                      <div className="text-sm italic text-[#5A5A40]">{idea.trendSource}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[#8E8E70] mb-1">수익화 전략</div>
                        <div className="text-sm font-medium text-[#5A5A40]">{idea.monetizationStrategy}</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#E5E1DA] group-hover:text-[#5A5A40] transition-all transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              ))}
              
              {!loading && ideas.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-[#E5E1DA] rounded-[32px]">
                  <Lightbulb className="w-12 h-12 text-[#E5E1DA] mx-auto mb-4" />
                  <p className="text-[#8E8E70]">분석 버튼을 눌러 새로운 아이디어를 도출해보세요.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <header>
              <h2 className="text-4xl font-serif font-light mb-2">나의 아카이브</h2>
              <p className="text-[#8E8E70]">저장된 {archive.length}개의 수익화 아이디어</p>
            </header>

            <div className="space-y-4">
              {archive.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handleViewDetail(item)}
                  className="bg-white rounded-3xl p-6 border border-[#E5E1DA] flex flex-col md:flex-row gap-6 items-start cursor-pointer hover:shadow-sm transition-all group"
                >
                  <div className="bg-[#F5F2ED] p-4 rounded-2xl text-[#5A5A40] shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest">{item.category}</span>
                      <span className="text-[10px] text-[#8E8E70]">{item.createdAt ? format(item.createdAt.toDate(), 'yyyy.MM.dd') : ''}</span>
                    </div>
                    <h3 className="text-xl font-serif group-hover:text-[#5A5A40] transition-colors">{item.title}</h3>
                    <p className="text-sm text-[#5A5A40] leading-relaxed">{item.description}</p>
                    <div className="pt-4 flex flex-wrap gap-4 text-xs">
                      <div className="bg-[#F5F2ED] px-3 py-1 rounded-full text-[#5A5A40]">
                        <span className="opacity-60 mr-1">트렌드:</span> {item.trendSource}
                      </div>
                      <div className="bg-[#5A5A40]/10 px-3 py-1 rounded-full text-[#5A5A40]">
                        <span className="opacity-60 mr-1">전략:</span> {item.monetizationStrategy}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteIdea(item.id);
                    }}
                    className="text-[#E5E1DA] hover:text-red-400 p-2 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              
              {archive.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-[#E5E1DA] rounded-[32px]">
                  <p className="text-[#8E8E70]">아카이브가 비어 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
          <div 
            className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm" 
            onClick={() => setSelectedIdea(null)}
          />
            <div className="relative w-full max-w-5xl bg-white rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
            <header className="p-4 md:p-8 border-b border-[#F5F2ED] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <div className="bg-[#F5F2ED] p-2 md:p-3 rounded-xl md:rounded-2xl text-[#5A5A40] shrink-0">
                  {getCategoryIcon(selectedIdea.category)}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest mb-0.5 md:mb-1">{selectedIdea.category}</div>
                  <h3 className="text-lg md:text-2xl font-serif leading-tight truncate">{selectedIdea.title}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(selectedIdea, detailedContent);
                  }}
                  title="아카이브 저장"
                  className="flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-full bg-[#5A5A40] text-white text-sm font-medium hover:bg-[#4A4A30] transition-all shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden md:inline">아카이브 저장</span>
                </button>
                <button 
                  onClick={handleCopyPrompt}
                  title="실행 프롬프트 복사"
                  className="flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] text-sm font-medium hover:bg-[#5A5A40]/20 transition-all"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden md:inline">실행 프롬프트 복사</span>
                </button>
                <button 
                  onClick={() => setSelectedIdea(null)}
                  className="p-1.5 md:p-2 text-[#8E8E70] hover:text-[#1A1A1A] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-12">
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                  <div className="relative">
                    <RefreshCw className="w-12 h-12 text-[#5A5A40] animate-spin" />
                    <Sparkles className="w-6 h-6 text-[#5A5A40] absolute -top-2 -right-2 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-serif text-[#5A5A40] mb-2">AI가 심화 가이드를 생성하고 있습니다...</p>
                    <p className="text-[#8E8E70] text-sm">잠시만 기다려주세요. 실행 가능한 초안을 작성 중입니다.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:font-light prose-p:text-[#5A5A40] prose-p:leading-relaxed prose-li:text-[#5A5A40]">
                    <div className="mb-10 p-6 bg-[#F5F2ED] rounded-3xl border border-[#E5E1DA]">
                      <h4 className="text-sm font-bold text-[#5A5A40] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" /> 기본 요약
                      </h4>
                      <p className="text-sm mb-0">{selectedIdea.description}</p>
                    </div>

                    {detailError && (
                      <div className="mb-10 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-600">
                        <Activity className="w-6 h-6 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-sm mb-1">오류가 발생했습니다</p>
                          <p className="text-xs opacity-90">{detailError}</p>
                        </div>
                      </div>
                    )}

                    <ReactMarkdown>{detailedContent}</ReactMarkdown>
                  </div>

                  {/* Feedback Section */}
                  <div className="border-t border-[#F5F2ED] pt-12">
                    <div className="bg-[#F5F2ED]/50 rounded-[32px] p-8 border border-[#E5E1DA]">
                      <h4 className="text-lg font-serif mb-4 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#5A5A40]" /> 내 의견 추가하여 발전시키기
                      </h4>
                      <p className="text-sm text-[#8E8E70] mb-6">
                        아이디어에 대한 본인의 생각이나 추가하고 싶은 내용을 적어주세요. AI가 이를 반영하여 가이드를 고도화합니다.
                      </p>
                      <textarea 
                        value={userFeedback}
                        onChange={(e) => setUserFeedback(e.target.value)}
                        placeholder="예: '취준생 대상 코칭에서 포트폴리오뿐만 아니라 면접 팁도 추가해줘', '노션 템플릿에 AI 자동화 기능을 더 강조하고 싶어' 등"
                        className="w-full bg-white border border-[#E5E1DA] rounded-2xl p-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all min-h-[120px] mb-6"
                      />
                      <div className="flex gap-4">
                        {contentHistory.length > 0 && (
                          <button 
                            onClick={handleRestorePrevious}
                            className="flex-1 px-8 py-4 rounded-full border border-[#E5E1DA] text-[#5A5A40] hover:bg-white transition-all font-medium"
                          >
                            이전 버전으로 복구
                          </button>
                        )}
                        <button 
                          onClick={handleDevelopIdea}
                          disabled={isDeveloping || !userFeedback.trim()}
                          className={cn(
                            "flex-1 bg-[#5A5A40] text-white py-4 rounded-full flex items-center justify-center gap-3 hover:bg-[#4A4A30] transition-all disabled:opacity-50 font-medium",
                            contentHistory.length === 0 && "w-full"
                          )}
                        >
                          {isDeveloping ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          아이디어 고도화하기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <footer className="p-8 border-t border-[#F5F2ED] bg-[#F5F2ED]/30 shrink-0 flex justify-end">
              <button 
                onClick={() => setSelectedIdea(null)}
                className="px-8 py-3 rounded-full border border-[#E5E1DA] text-[#5A5A40] hover:bg-white transition-all font-medium"
              >
                닫기
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
